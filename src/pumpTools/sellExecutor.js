// @ts-nocheck
// sellExecutor.js - HootBot Sell Execution Module

const { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const { getAssociatedTokenAddress } = require('@solana/spl-token');
const bs58 = require('bs58');

// Get wallet keypair
function getWalletKeypair() {
  const secretKey = process.env.WALLET_SECRET_KEY;
  if (!secretKey) {
    throw new Error('WALLET_SECRET_KEY not found in environment');
  }
  
  try {
    return Keypair.fromSecretKey(bs58.decode(secretKey));
  } catch (e) {
    try {
      const secretKeyArray = JSON.parse(secretKey);
      return Keypair.fromSecretKey(new Uint8Array(secretKeyArray));
    } catch (e2) {
      throw new Error('Invalid WALLET_SECRET_KEY format');
    }
  }
}

// Get token balance
async function getTokenBalance(connection, walletAddress, tokenMint) {
  try {
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, walletAddress);
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals);
  } catch (error) {
    console.error('Error getting token balance:', error.message);
    return 0;
  }
}

// Execute coordinated sell
async function initiateCoordinatedSell(tokenMint, percentage) {
  if (!percentage) percentage = 50;
  
  console.log(`\n💰 Initiating sell of ${percentage}% position...`);
  
  try {
    const connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    const wallet = getWalletKeypair();
    const tokenMintPubkey = new PublicKey(tokenMint);
    
    const currentBalance = await getTokenBalance(
      connection,
      wallet.publicKey,
      tokenMintPubkey
    );
    
    if (currentBalance === 0) {
      console.log('❌ No tokens to sell!');
      return false;
    }
    
    const sellAmount = currentBalance * (percentage / 100);
    console.log(`📊 Current balance: ${currentBalance.toFixed(2)} tokens`);
    console.log(`📉 Selling: ${sellAmount.toFixed(2)} tokens (${percentage}%)`);
    
    console.log('\n⚠️  SELL ALERT - Manual action required!');
    console.log(`📱 Please sell ${percentage}% of your position`);
    console.log('   1. Phantom wallet → Swap');
    console.log('   2. Raydium.io/swap');
    console.log('   3. Jup.ag');
    
    return true;
    
  } catch (error) {
    console.error('❌ Sell execution failed:', error.message);
    return false;
  }
}

// Emergency exit
async function emergencyExitPosition(tokenMint) {
  console.log('\n🚨 EMERGENCY EXIT - Selling 100% of position!');
  return await initiateCoordinatedSell(tokenMint, 100);
}

// Smart profit taking
async function smartProfitTake(tokenMint, buyPrice, currentPrice) {
  const profitPercentage = ((currentPrice - buyPrice) / buyPrice) * 100;
  
  console.log(`\n📈 Profit Analysis:`);
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
  }
  
  if (sellPercentage > 0) {
    return await initiateCoordinatedSell(tokenMint, sellPercentage);
  }
  
  console.log('⏳ Holding position');
  return false;
}

module.exports = {
  initiateCoordinatedSell,
  getTokenBalance,
  smartProfitTake,
  emergencyExitPosition,
  getWalletKeypair
};