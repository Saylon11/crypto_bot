// src/pumpBot/copyTrader.ts

import dotenv from 'dotenv';
dotenv.config();

import { Connection, PublicKey } from '@solana/web3.js';
import { initiateCoordinatedBuy, executePanicBuy } from './tradeExecutor';
import { mind } from './mindClient';

const HELIUS_RPC_URL = process.env.HELIUS_API_KEY
  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
  : 'https://api.mainnet-beta.solana.com';

const connection = new Connection(HELIUS_RPC_URL, 'confirmed');

// Replace with a known sniper or influencer wallet
const TARGET_WALLET = process.env.HELIUS_TARGET_WALLET ? 
  new PublicKey(process.env.HELIUS_TARGET_WALLET) : 
  null;

// Use TEST_TOKEN_ADDRESS from env for consistency
const MONITORED_TOKEN = process.env.TEST_TOKEN_ADDRESS || 'BKjx5R9AuxXMUVM2hSxu1CkPSSdBCzJraMzEc8WZ7tvh';

if (!TARGET_WALLET) {
  console.error('❌ No target wallet configured. Set HELIUS_TARGET_WALLET in .env');
  process.exit(1);
}

console.log(`📡 Copy trading setup:`);
console.log(`   Target wallet: ${TARGET_WALLET.toBase58()}`);
console.log(`   Token: ${MONITORED_TOKEN}`);
console.log(`   Starting MIND-enhanced copy trader...\n`);

// Track recent activity to avoid duplicate triggers
const recentTransactions = new Set<string>();
const TRANSACTION_CACHE_TIME = 60000; // 1 minute

connection.onLogs(TARGET_WALLET, async (logInfo) => {
  const { logs, signature } = logInfo;
  
  // Skip if we've already seen this transaction
  if (recentTransactions.has(signature)) {
    return;
  }
  
  recentTransactions.add(signature);
  setTimeout(() => recentTransactions.delete(signature), TRANSACTION_CACHE_TIME);

  const isBuy = logs.some(log => log.includes('Program log: Instruction: Transfer')) &&
                logs.some(log => log.includes(MONITORED_TOKEN));

  if (isBuy) {
    console.log(`\n🛰 BUY DETECTED!`);
    console.log(`   Wallet: ${TARGET_WALLET.toBase58()}`);
    console.log(`   Token: ${MONITORED_TOKEN}`);
    console.log(`   TX: https://solscan.io/tx/${signature}`);
    
    // Get MIND analysis before copying
    const marketState = await mind.getMarketState(MONITORED_TOKEN);
    console.log(`\n🧠 MIND Analysis:`);
    console.log(`   Survivability: ${marketState.survivabilityScore}%`);
    console.log(`   Recommendation: ${marketState.recommendation}`);
    console.log(`   Confidence: ${marketState.recommendedPercentage}%`);
    
    // Decide copy strategy based on MIND
    if (marketState.recommendation === "EXIT" || marketState.recommendation === "SELL") {
      console.log(`⚠️ MIND warns against copying! Market state: ${marketState.reason}`);
      return;
    }
    
    if (marketState.survivabilityScore > 80 && marketState.recommendation === "BUY") {
      // High confidence - panic buy with larger size
      console.log(`🔥 HIGH CONFIDENCE COPY! Using 2x size`);
      await executePanicBuy(2.0);
    } else if (marketState.survivabilityScore > 60) {
      // Medium confidence - normal copy
      console.log(`✅ Normal confidence copy with 0.2 SOL`);
      await initiateCoordinatedBuy(0.2);
    } else {
      // Low confidence - smaller copy
      console.log(`⚡ Low confidence copy with 0.1 SOL`);
      await initiateCoordinatedBuy(0.1);
    }
  }
}, 'confirmed');

// Also monitor for sells to track whale exits
connection.onLogs(TARGET_WALLET, async (logInfo) => {
  const { logs, signature } = logInfo;
  
  const isSell = logs.some(log => log.includes('Program log: Instruction: Transfer')) &&
                 logs.some(log => log.includes(MONITORED_TOKEN)) &&
                 logs.some(log => log.includes('decrease'));

  if (isSell && !recentTransactions.has(signature + '_sell')) {
    recentTransactions.add(signature + '_sell');
    console.log(`\n🚨 SELL DETECTED from tracked wallet!`);
    console.log(`   Consider exiting position`);
    console.log(`   TX: https://solscan.io/tx/${signature}`);
    
    // TODO: Implement automated sell logic
  }
}, 'confirmed');