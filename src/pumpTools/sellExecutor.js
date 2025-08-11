// src/pumpTools/sellExecutor.js - COMPLETE Sell Execution Module
const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const { loadHootBotWallet } = require('../utils/walletUtils');
const fetch = require('node-fetch');
const bs58 = require('bs58');

// Constants
const PUMP_API_BASE = 'https://pumpportal.fun/api';
const PUMP_TRADE_ENDPOINT = `${PUMP_API_BASE}/trade-local`;
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Get RPC connection
function getConnection() {
  const rpcUrl = process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com';
  return new Connection(rpcUrl, 'confirmed');
}

// Get token balance
async function getTokenBalance(connection, walletAddress, tokenMint) {
  try {
    const tokenAccount = await getAssociatedTokenAddress(
      new PublicKey(tokenMint),
      walletAddress
    );
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return {
      uiAmount: parseFloat(balance.value.uiAmount || 0),
      amount: balance.value.amount,
      decimals: balance.value.decimals
    };
  } catch (error) {
    console.error('Error getting token balance:', error.message);
    return { uiAmount: 0, amount: '0', decimals: 0 };
  }
}

// Check if token is on Pump.fun
async function isTokenOnPumpFun(tokenMint) {
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
async function executePumpFunSell(tokenMint, sellAmount, decimals, wallet, connection) {
  try {
    console.log(`\n🔄 Executing Pump.fun sell:`);
    console.log(`   Amount: ${sellAmount} tokens`);
    
    // Convert to raw amount
    const rawAmount = Math.floor(sellAmount * Math.pow(10, decimals));
    
    const requestBody = {
      publicKey: wallet.publicKey.toString(),
      action: 'sell',
      mint: tokenMint,
      amount: rawAmount.toString(), // Pump expects string
      denominatedInSol: 'false', // We're selling tokens, not SOL
      slippage: 15, // Higher slippage for sells
      priorityFee: 0.0005,
      pool: 'pump'
    };
    
    console.log(`📤 Calling Pump.fun API...`);
    
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
      throw new Error(`Pump.fun API error: ${response.status}`);
    }

    // Get transaction data
    const data = await response.arrayBuffer();
    const tx = VersionedTransaction.deserialize(new Uint8Array(data));
    
    // Sign the transaction
    tx.sign([wallet]);
    console.log(`✅ Transaction signed`);
    
    // Send the transaction
    console.log(`📡 Sending sell transaction...`);
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: true,
      maxRetries: 3
    });
    
    console.log(`✅ Sell transaction sent!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');
    
    console.log(`✅ Sell confirmed!`);
    return { success: true, signature };
    
  } catch (error) {
    console.error('❌ Pump.fun sell error:', error);
    throw error;
  }
}

// Execute sell on Jupiter/Raydium
async function executeJupiterSell(tokenMint, sellAmount, decimals, wallet, connection) {
  try {
    console.log(`\n🪐 Executing Jupiter/Raydium sell:`);
    console.log(`   Amount: ${sellAmount} tokens`);
    
    // Convert to raw amount
    const rawAmount = Math.floor(sellAmount * Math.pow(10, decimals));
    
    // Get quote from Jupiter (swapping token to SOL)
    console.log(`📊 Getting sell quote from Jupiter...`);
    const quoteResponse = await fetch(
      `${JUPITER_QUOTE_API}/quote?inputMint=${tokenMint}&outputMint=${SOL_MINT}&amount=${rawAmount}&slippageBps=300`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Failed to get quote: ${await quoteResponse.text()}`);
    }
    
    const quoteData = await quoteResponse.json();
    const outputAmount = parseFloat(quoteData.outAmount) / LAMPORTS_PER_SOL;
    
    console.log(`✅ Quote received:`);
    console.log(`   Expected output: ${outputAmount.toFixed(4)} SOL`);
    console.log(`   Price impact: ${quoteData.priceImpactPct}%`);
    
    // Get swap transaction
    console.log(`🔄 Getting swap transaction...`);
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
    
    console.log(`📡 Sending sell transaction...`);
    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2
    });
    
    console.log(`✅ Sell transaction sent!`);
    console.log(`   Signature: ${signature}`);
    console.log(`   Expected SOL: ${outputAmount.toFixed(4)}`);
    console.log(`   Explorer: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    console.log(`✅ Sell confirmed! Received ~${outputAmount.toFixed(4)} SOL`);
    return { success: true, signature, solReceived: outputAmount };
    
  } catch (error) {
    console.error('❌ Jupiter sell error:', error);
    throw error;
  }
}

// Main sell function - FULLY AUTOMATIC
async function initiateCoordinatedSell(tokenMint, percentage = 50) {
  console.log(`\n💰 Executing automatic sell of ${percentage}% position...`);
  
  try {
    const connection = getConnection();
    const wallet = loadHootBotWallet();
    
    // Get current balance
    const balance = await getTokenBalance(
      connection,
      wallet.publicKey,
      tokenMint
    );
    
    if (balance.uiAmount === 0) {
      console.log('❌ No tokens to sell!');
      return { success: false, error: 'No balance' };
    }
    
    const sellAmount = balance.uiAmount * (percentage / 100);
    console.log(`📊 Current balance: ${balance.uiAmount.toFixed(2)} tokens`);
    console.log(`📉 Selling: ${sellAmount.toFixed(2)} tokens (${percentage}%)`);
    
    // Check where token is traded
    const onPumpFun = await isTokenOnPumpFun(tokenMint);
    
    let result;
    if (onPumpFun) {
      console.log(`✅ Token found on Pump.fun`);
      result = await executePumpFunSell(
        tokenMint,
        sellAmount,
        balance.decimals,
        wallet,
        connection
      );
    } else {
      console.log(`✅ Token graduated to Raydium, using Jupiter`);
      result = await executeJupiterSell(
        tokenMint,
        sellAmount,
        balance.decimals,
        wallet,
        connection
      );
    }
    
    console.log(`\n🎉 SELL SUCCESSFUL!`);
    console.log(`   Sold ${percentage}% of position`);
    console.log(`   Remaining: ${(balance.uiAmount - sellAmount).toFixed(2)} tokens`);
    
    return result;
    
  } catch (error) {
    console.error('❌ Sell execution failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Emergency exit - sell 100%
async function emergencyExitPosition(tokenMint) {
  console.log('\n🚨 EMERGENCY EXIT - Selling 100% of position!');
  return await initiateCoordinatedSell(tokenMint, 100);
}

// Smart profit taking with real price checking
async function smartProfitTake(tokenMint, entryData) {
  try {
    const connection = getConnection();
    const wallet = loadHootBotWallet();
    
    // Get current balance
    const balance = await getTokenBalance(
      connection,
      wallet.publicKey,
      tokenMint
    );
    
    if (balance.uiAmount === 0) {
      console.log('📊 No position to take profit from');
      return { success: false, error: 'No balance' };
    }
    
    // Get current price from Jupiter
    console.log('\n📈 Checking current price...');
    const quoteResponse = await fetch(
      `${JUPITER_QUOTE_API}/quote?inputMint=${tokenMint}&outputMint=${SOL_MINT}&amount=${balance.amount}&slippageBps=300`
    );
    
    if (!quoteResponse.ok) {
      throw new Error('Failed to get current price');
    }
    
    const quoteData = await quoteResponse.json();
    const currentValue = parseFloat(quoteData.outAmount) / LAMPORTS_PER_SOL;
    const profitPercentage = ((currentValue - entryData.solSpent) / entryData.solSpent) * 100;
    
    console.log(`\n📊 Position Analysis:`);
    console.log(`   Entry: ${entryData.solSpent} SOL`);
    console.log(`   Current Value: ${currentValue.toFixed(4)} SOL`);
    console.log(`   Profit: ${profitPercentage.toFixed(2)}%`);
    
    let sellPercentage = 0;
    
    if (profitPercentage >= 100) {
      sellPercentage = 50;
      console.log('🎯 2x reached! Taking 50% profit');
    } else if (profitPercentage >= 50) {
      sellPercentage = 25;
      console.log('📊 1.5x reached! Taking 25% profit');
    } else if (profitPercentage >= 25) {
      sellPercentage = 10;
      console.log('💰 1.25x reached! Taking 10% profit');
    } else if (profitPercentage <= -25) {
      sellPercentage = 100;
      console.log('🛑 Stop loss triggered! Exiting position');
    }
    
    if (sellPercentage > 0) {
      return await initiateCoordinatedSell(tokenMint, sellPercentage);
    }
    
    console.log('⏳ Holding position - target not reached');
    return { success: false, error: 'Target not reached' };
    
  } catch (error) {
    console.error('❌ Smart profit take error:', error.message);
    return { success: false, error: error.message };
  }
}

// Export all functions
module.exports = {
  initiateCoordinatedSell,
  getTokenBalance,
  smartProfitTake,
  emergencyExitPosition,
  getConnection,
  isTokenOnPumpFun
};