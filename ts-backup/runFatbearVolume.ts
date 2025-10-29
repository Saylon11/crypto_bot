// HootBot/src/bots/volume/runFatbearVolume.ts

import dotenv from 'dotenv';
dotenv.config();

import { VolumeChurnBot } from './volumeChurnBot';

// Week configuration based on your strategy
const WEEK_CONFIG = {
  week1: {
    churnRatio: 0.7,
    profitRatio: 0.2,
    supportRatio: 0.1
  },
  week2: {
    churnRatio: 0.5,
    profitRatio: 0.4,
    supportRatio: 0.1
  },
  week3: {
    churnRatio: 0.6,
    profitRatio: 0.3,
    supportRatio: 0.1
  }
};

// Determine current week (you can adjust this)
const CURRENT_WEEK = 'week1'; // Change as needed

async function main() {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           🦉 HOOTBOT FATBEAR VOLUME ENGINE 🐻            ║
║                                                          ║
║  Strategy: Volume Churn Only (No Distribution)           ║
║  Week: ${CURRENT_WEEK.toUpperCase()}                                         ║
║  Mode: ${process.env.DISTRIBUTION_MODE || 'LIVE'}                                        ║
╚══════════════════════════════════════════════════════════╝
  `);

  // Verify configuration
  console.log(`\n📋 Configuration Check:`);
  console.log(`   Token: FATBEAR (${process.env.FATBEAR_TOKEN_MINT?.slice(0, 8)}...)`);
  console.log(`   Daily Volume Target: ${process.env.DAILY_VOLUME_TARGET_SOL} SOL`);
  console.log(`   Trade Size: ${process.env.MIN_TRADE_SIZE_SOL} - ${process.env.MAX_TRADE_SIZE_SOL} SOL`);
  console.log(`   Wallet Cooldown: ${process.env.MIN_WALLET_COOLDOWN_MINUTES} minutes`);
  console.log(`   Support Buy Ratio: ${(parseFloat(process.env.WEEK1_SUPPORT_RATIO || '0.1') * 100).toFixed(0)}%`);
  
  // Check if we have wallets
  const hasWallets = process.env.FISH_WALLET_1 || process.env.DOLPHIN_WALLET_1;
  if (!hasWallets) {
    console.error(`\n❌ ERROR: No wallets configured!`);
    console.error(`   Please add FISH_WALLET_1 and/or DOLPHIN_WALLET_1 to your .env file`);
    process.exit(1);
  }

  // Verify RPC
  if (!process.env.HELIUS_API_KEY) {
    console.error(`\n❌ ERROR: No HELIUS_API_KEY configured!`);
    process.exit(1);
  }

  console.log(`\n🚀 Starting FATBEAR Volume Churn Bot...\n`);

  // Initialize the bot
  const bot = new VolumeChurnBot(process.env.FATBEAR_TOKEN_MINT!);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down gracefully...');
    bot.stop();
    setTimeout(() => process.exit(0), 2000);
  });

  process.on('SIGTERM', () => {
    console.log('\n\n👋 Received SIGTERM, shutting down...');
    bot.stop();
    setTimeout(() => process.exit(0), 2000);
  });

  // Start the bot
  try {
    await bot.run();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the bot
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});