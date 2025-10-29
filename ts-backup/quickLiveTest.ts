// HootBot/src/pumpTools/quickLiveTest.ts
// Run this with: npx ts-node src/pumpTools/quickLiveTest.ts

import { initiateCoordinatedBuy } from './tradeExecutor';
import { Connection } from '@solana/web3.js';
import { decodeHootBotKeypair } from '../utils/phantomUtils';
import dotenv from 'dotenv';

dotenv.config();

async function runLiveTest() {
  console.log('\n🦉 HootBot Live Trading Test\n');
  
  // Configuration
  const testAmount = 0.01; // Start with minimum amount
  const tokenMint = process.env.TARGET_TOKEN_MINT || process.env.TARGET_TOKEN_MINT;
  
  // Check wallet balance first
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = decodeHootBotKeypair();
  
  console.log(`📍 Wallet: ${wallet.publicKey.toString()}`);
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / 1e9).toFixed(4)} SOL`);
  
  if (balance < 0.015 * 1e9) {
    console.error('❌ Insufficient balance! Need at least 0.015 SOL (0.01 for trade + fees)');
    return;
  }
  
  console.log(`🎯 Target token: ${tokenMint}`);
  console.log(`💸 Trade amount: ${testAmount} SOL`);
  console.log('\n⏳ Executing trade...\n');
  
  try {
    // Use the coordinated buy function which handles everything
    await initiateCoordinatedBuy(testAmount, true); // true = skip MIND analysis
    
    console.log('\n✅ Test complete! Check your wallet for the tokens.');
    console.log('📱 Open Phantom wallet to see your new position');
    
  } catch (error) {
    console.error('\n❌ Trade failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('balance')) {
        console.log('\n💡 Tip: Make sure you have enough SOL in your wallet');
      } else if (error.message.includes('liquidity')) {
        console.log('\n💡 Tip: Try an even smaller amount like 0.001 SOL');
      }
    }
  }
}

// Run the test
console.log('Starting HootBot...');
runLiveTest().catch(console.error);