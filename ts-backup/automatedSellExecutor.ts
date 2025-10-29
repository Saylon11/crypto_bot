// HootBot/src/pumpTools/automatedSellExecutor.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fetch from 'node-fetch';
import * as bs58 from 'bs58';

// API endpoints
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const PUMP_API_BASE = 'https://pumpportal.fun/api';

export interface SellResult {
  success: boolean;
  signature?: string;
  solReceived?: number;
  error?: string;
}

// Get token balance for a wallet
export async function getTokenBalance(
  connection: Connection,
  walletAddress: PublicKey,
  tokenMint: PublicKey
): Promise<{ balance: number; decimals: number }> {
  try {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, walletAddress);
    const accountInfo = await connection.getTokenAccountBalance(tokenAccount);
    
    return {
      balance: Number(accountInfo.value.amount) / Math.pow(10, accountInfo.value.decimals),
      decimals: accountInfo.value.decimals
    };
  } catch (error) {
    console.error('Error getting token balance:', error);
    return { balance: 0, decimals: 9 };
  }
}

// Check if token is still on Pump.fun
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

// Execute sell on Pump.fun
async function executePumpFunSell(
  tokenMint: string,
  tokenAmount: number,
  decimals: number,
  wallet: Keypair,
  connection: Connection
): Promise<SellResult> {
  try {
    console.log(`   🎯 Selling on Pump.fun...`);
    
    const requestBody = {
      publicKey: wallet.publicKey.toString(),
      action: 'sell',
      mint: tokenMint,
      amount: Math.floor(tokenAmount * Math.pow(10, decimals)), // Token amount in smallest units
      denominatedInSol: 'false', // We're selling tokens, not SOL worth
      slippage: 10, // 10% slippage for volume trades
      priorityFee: 0.0001, // Small priority fee
      pool: 'pump'
    };
    
    const response = await fetch(`${PUMP_API_BASE}/trade-local`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pump.fun API error: ${errorText}`);
    }

    const txData = await response.json();
    
    // Deserialize and sign transaction
    const tx = VersionedTransaction.deserialize(new Uint8Array(Buffer.from(txData.transaction, 'base64')));
    tx.sign([wallet]);
    
    // Send transaction
    const signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: true,
      maxRetries: 3
    });
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    return {
      success: true,
      signature,
      solReceived: 0 // Would need to parse transaction to get exact amount
    };
    
  } catch (error: any) {
    console.error('   ❌ Pump.fun sell error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute sell on Jupiter/Raydium
async function executeJupiterSell(
  tokenMint: string,
  tokenAmount: number,
  decimals: number,
  wallet: Keypair,
  connection: Connection
): Promise<SellResult> {
  try {
    console.log(`   🪐 Selling on Jupiter/Raydium...`);
    
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    
    // Get quote
    const amountInSmallestUnit = Math.floor(tokenAmount * Math.pow(10, decimals));
    const quoteResponse = await fetch(
      `${JUPITER_QUOTE_API}/quote?inputMint=${tokenMint}&outputMint=${SOL_MINT}&amount=${amountInSmallestUnit}&slippageBps=1000`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Failed to get quote: ${await quoteResponse.text()}`);
    }
    
    const quoteData = await quoteResponse.json();
    const outputSol = Number(quoteData.outAmount) / LAMPORTS_PER_SOL;
    
    console.log(`   📊 Quote: ${tokenAmount.toFixed(2)} tokens → ${outputSol.toFixed(4)} SOL`);
    console.log(`   📉 Price impact: ${quoteData.priceImpactPct}%`);
    
    // Get swap transaction
    const swapResponse = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: 20000 // Priority fee
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Failed to get swap transaction: ${await swapResponse.text()}`);
    }
    
    const swapData = await swapResponse.json();
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Sign and send
    transaction.sign([wallet]);
    
    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2
    });
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    return {
      success: true,
      signature,
      solReceived: outputSol
    };
    
  } catch (error: any) {
    console.error('   ❌ Jupiter sell error:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Main sell function that routes to appropriate DEX
export async function executeSell(
  wallet: Keypair,
  tokenMint: string,
  percentage: number = 100, // Default to selling 100%
  connection: Connection
): Promise<SellResult> {
  try {
    const tokenMintPubkey = new PublicKey(tokenMint);
    
    // Get token balance
    const { balance, decimals } = await getTokenBalance(
      connection,
      wallet.publicKey,
      tokenMintPubkey
    );
    
    if (balance === 0) {
      return {
        success: false,
        error: 'No tokens to sell'
      };
    }
    
    // Calculate amount to sell
    const sellAmount = balance * (percentage / 100);
    console.log(`   💰 Selling ${sellAmount.toFixed(2)} tokens (${percentage}% of ${balance.toFixed(2)})`);
    
    // Check if token is on Pump.fun or graduated
    const onPumpFun = await isTokenOnPumpFun(tokenMint);
    
    if (onPumpFun) {
      return await executePumpFunSell(tokenMint, sellAmount, decimals, wallet, connection);
    } else {
      return await executeJupiterSell(tokenMint, sellAmount, decimals, wallet, connection);
    }
    
  } catch (error: any) {
    console.error('Sell execution error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Convenience function for volume churn bot
export async function executeChurnSell(
  wallet: Keypair,
  tokenMint: string,
  connection: Connection
): Promise<boolean> {
  const result = await executeSell(wallet, tokenMint, 100, connection); // Always sell 100% for churn
  
  if (result.success) {
    console.log(`   ✅ Sell TX: https://solscan.io/tx/${result.signature}`);
    if (result.solReceived) {
      console.log(`   💵 Received: ${result.solReceived.toFixed(4)} SOL`);
    }
    return true;
  } else {
    console.log(`   ❌ Sell failed: ${result.error}`);
    return false;
  }
}