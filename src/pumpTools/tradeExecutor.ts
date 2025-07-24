// HootBot/src/pumpTools/tradeExecutor.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction, TransactionMessage, ComputeBudgetProgram } from '@solana/web3.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { decodeHootBotKeypair } from '../utils/phantomUtils';

dotenv.config();

// API endpoints
const PUMP_API_BASE = 'https://pumpportal.fun/api';
const PUMP_TRADE_ENDPOINT = `${PUMP_API_BASE}/trade-local`;
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';

export interface BuyResult {
  success: boolean;
  signature?: string;
  tokensReceived?: number;
  error?: string;
}

// Check if token is on pump.fun
async function isTokenOnPumpFun(tokenMint: string): Promise<boolean> {
  try {
    const response = await fetch(`https://frontend-api.pump.fun/coins/${tokenMint}`);
    if (response.ok) {
      const data = await response.json();
      return !data.complete; // If complete = true, it graduated to Raydium
    }
    return false;
  } catch {
    return false;
  }
}

// Simple MIND analysis check (replace with your actual MIND logic if needed)
async function getMindAnalysis(tokenMint: string): Promise<{ decision: string; reasoning: string }> {
  // TODO: Implement actual MIND analysis if needed
  return {
    decision: 'BUY',
    reasoning: 'Bypassed for raids'
  };
}

// Execute swap on Jupiter/Raydium
async function executeJupiterSwap(
  tokenMint: string,
  amountSol: number,
  wallet: Keypair,
  connection: Connection
): Promise<{ signature: string; tokensReceived: number }> {
  try {
    console.log(`\n🪐 Preparing Jupiter/Raydium swap:`);
    console.log(`   Token: ${tokenMint}`);
    console.log(`   Amount: ${amountSol} SOL`);
    console.log(`   Wallet: ${wallet.publicKey.toString()}`);
    
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    // Get quote from Jupiter
    console.log(`\n📊 Getting quote from Jupiter...`);
    const quoteResponse = await fetch(
      `${JUPITER_QUOTE_API}/quote?inputMint=${SOL_MINT}&outputMint=${tokenMint}&amount=${Math.floor(amountSol * LAMPORTS_PER_SOL)}&slippageBps=300`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Failed to get quote: ${await quoteResponse.text()}`);
    }
    
    const quoteData = await quoteResponse.json();
    const outputAmount = parseFloat(quoteData.outAmount);
    
    console.log(`✅ Quote received:`);
    console.log(`   Expected output: ${(outputAmount / LAMPORTS_PER_SOL).toFixed(2)} tokens`);
    console.log(`   Price impact: ${quoteData.priceImpactPct}%`);
    
    // Get swap transaction
    console.log(`\n🔄 Getting swap transaction...`);
    const swapResponse = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: 20000
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Failed to get swap transaction: ${await swapResponse.text()}`);
    }
    
    const swapData = await swapResponse.json();
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Sign and send
    console.log(`✅ Transaction prepared, signing...`);
    transaction.sign([wallet]);
    
    console.log(`\n📡 Sending transaction...`);
    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2
    });
    
    console.log(`✅ Transaction sent!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    console.log(`\n⏳ Waiting for confirmation...`);
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    console.log(`✅ Transaction confirmed!`);
    
    return {
      signature,
      tokensReceived: outputAmount
    };
    
  } catch (error) {
    console.error('\n🚨 Jupiter swap error:', error);
    throw error;
  }
}

// Execute swap on Pump.fun
async function executePumpFunSwap(
  tokenMint: string,
  amountSol: number,
  wallet: Keypair,
  connection: Connection
): Promise<{ signature: string; tokensReceived: number }> {
  try {
    console.log(`\n🔄 Preparing Pump.fun swap:`);
    console.log(`   Token: ${tokenMint}`);
    console.log(`   Amount: ${amountSol} SOL`);
    console.log(`   Wallet: ${wallet.publicKey.toString()}`);
    
    // Check wallet balance first
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`   Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    if (balance < (amountSol * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL)) {
      throw new Error(`Insufficient balance. Have: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL, Need: ${(amountSol + 0.01).toFixed(4)} SOL`);
    }
    
    // Adjust slippage based on amount
    let slippage = 10;
    if (amountSol < 0.01) {
      slippage = 25; // Higher slippage for small amounts in low liquidity
    } else if (amountSol < 0.1) {
      slippage = 15;
    }
    
    // Create the buy transaction through Pump.fun API
    const requestBody = {
      publicKey: wallet.publicKey.toString(),
      action: 'buy',
      mint: tokenMint,
      amount: Math.floor(amountSol * LAMPORTS_PER_SOL), // Convert SOL to lamports
      denominatedInSol: 'true',
      slippage: slippage,
      priorityFee: 0.0005, // 0.0005 SOL priority fee
      pool: 'pump'
    };
    
    console.log(`\n📤 Calling Pump.fun API...`);
    console.log(`   Slippage: ${slippage}%`);
    
    const response = await fetch(PUMP_TRADE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Pump.fun API error:`, errorText);
      
      // Parse common errors
      if (errorText.includes('Not enough tokens to buy')) {
        throw new Error(`Not enough liquidity. Try a smaller amount (current: ${amountSol} SOL)`);
      } else if (errorText.includes('Insufficient')) {
        throw new Error('Insufficient SOL balance for trade + fees');
      } else if (errorText.includes('Invalid mint')) {
        throw new Error('Token not found on Pump.fun');
      }
      
      throw new Error(`Pump.fun API error: ${response.status} - ${errorText}`);
    }

    // Get transaction data
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));
    
    console.log(`✅ Transaction created successfully`);
    
    // Sign the transaction
    tx.sign([wallet]);
    console.log(`✅ Transaction signed`);
    
    // Send the transaction
    console.log(`\n📡 Sending transaction to blockchain...`);
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: true, // Skip preflight for pump.fun trades
      maxRetries: 3,
      preflightCommitment: 'confirmed'
    });
    
    console.log(`✅ Transaction sent!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    console.log(`\n⏳ Waiting for confirmation...`);
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    
    console.log(`✅ Transaction confirmed!`);
    
    // Estimate tokens received (actual amount would need to be parsed from transaction)
    const estimatedTokens = amountSol * 1000000; // Rough estimate
    
    return {
      signature,
      tokensReceived: estimatedTokens
    };
    
  } catch (error) {
    console.error('\n🚨 Swap error:', error);
    
    // Add helpful hints for common errors
    if (error instanceof Error) {
      if (error.message.includes('Not enough tokens')) {
        console.log('\n💡 Hint: Try a smaller amount like 0.001 SOL');
      } else if (error.message.includes('0x1')) {
        console.log('\n💡 Hint: Token might have low liquidity or high price impact');
      }
    }
    
    throw error;
  }
}

// Main swap function that routes to correct DEX
async function executeSwap(
  tokenMint: string,
  amountSol: number,
  wallet: Keypair,
  connection: Connection
): Promise<{ signature: string; tokensReceived: number }> {
  // Check if token is on pump.fun
  console.log(`\n🔍 Checking token location...`);
  const onPumpFun = await isTokenOnPumpFun(tokenMint);
  
  if (onPumpFun) {
    console.log(`✅ Token found on Pump.fun`);
    return executePumpFunSwap(tokenMint, amountSol, wallet, connection);
  } else {
    console.log(`✅ Token graduated to Raydium, using Jupiter`);
    return executeJupiterSwap(tokenMint, amountSol, wallet, connection);
  }
}

export async function executeBuy(
  tokenMint: string,
  amountSol: number,
  wallet: Keypair,
  connection: Connection,
  skipMindAnalysis: boolean = false
): Promise<BuyResult> {
  try {
    // Skip MIND analysis if requested (for raids)
    if (!skipMindAnalysis) {
      console.log('🧠 Checking MIND analysis...');
      const mindAnalysis = await getMindAnalysis(tokenMint);
      
      if (mindAnalysis.decision === 'EXIT' || mindAnalysis.decision === 'AVOID') {
        return {
          success: false,
          error: `MIND says ${mindAnalysis.decision}: ${mindAnalysis.reasoning}`
        };
      }
      
      console.log(`✅ MIND approved: ${mindAnalysis.decision}`);
    } else {
      console.log('⚡ MIND analysis bypassed for raid execution');
    }

    // Execute the actual swap (will auto-route to correct DEX)
    const result = await executeSwap(
      tokenMint,
      amountSol,
      wallet,
      connection
    );

    return {
      success: true,
      signature: result.signature,
      tokensReceived: result.tokensReceived
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function executePanicBuy(
  multiplier: number = 10,
  skipMind: boolean = true
): Promise<void> {
  console.log(`\n🚨 PANIC BUY INITIATED - ${multiplier}x multiplier`);
  
  const tokenMint = process.env.DUTCHBROS_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS;
  if (!tokenMint) {
    throw new Error('No token mint configured!');
  }

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = decodeHootBotKeypair();

  // Adjust base amount for low liquidity tokens
  const baseAmount = 0.001; // Reduced from 0.05 to 0.001
  const amount = baseAmount * multiplier;
  
  console.log(`   Using amount: ${amount} SOL (${baseAmount} * ${multiplier})`);
  
  const result = await executeBuy(
    tokenMint,
    amount,
    wallet,
    connection,
    skipMind // Skip MIND for panic buys by default
  );

  if (result.success) {
    console.log(`\n✅ Panic buy successful! Amount: ${amount} SOL`);
    console.log(`   Tokens received: ${result.tokensReceived?.toFixed(2) || 'Unknown'}`);
    console.log(`   TX: https://solscan.io/tx/${result.signature}`);
  } else {
    console.log(`\n❌ Panic buy failed: ${result.error}`);
  }
}

export async function initiateCoordinatedBuy(
  amountSol: number,
  skipMind: boolean = true
): Promise<void> {
  console.log(`\n🎯 Coordinated buy: ${amountSol} SOL`);
  
  const tokenMint = process.env.DUTCHBROS_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS;
  if (!tokenMint) {
    throw new Error('No token mint configured!');
  }

  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = decodeHootBotKeypair();
  
  console.log(`🦉 Using HootBot wallet: ${wallet.publicKey.toString()}`);

  const result = await executeBuy(
    tokenMint,
    amountSol,
    wallet,
    connection,
    skipMind // Skip MIND for coordinated buys by default
  );

  if (result.success) {
    console.log(`\n✅ Buy successful!`);
    console.log(`   TX: https://solscan.io/tx/${result.signature}`);
  } else {
    console.log(`\n❌ Buy failed: ${result.error}`);
  }
}

// Legacy function names for compatibility
export async function executeTrade(
  tokenMint: string,
  amountSol: number,
  wallet: Keypair,
  connection: Connection
): Promise<BuyResult> {
  return executeBuy(tokenMint, amountSol, wallet, connection, false);
}

export async function executeIntelligentTrade(
  tokenMint: string,
  amountSol: number
): Promise<BuyResult> {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = decodeHootBotKeypair();

  return executeBuy(tokenMint, amountSol, wallet, connection, false);
}