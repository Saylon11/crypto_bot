// runVolumeBot.js - Simple runner to bypass TypeScript issues
const dotenv = require('dotenv');
dotenv.config();

console.log('🦉 Starting FATBEAR Volume Churn Bot...\n');

// Show configuration
console.log('📋 Configuration:');
console.log(`   Token: ${process.env.FATBEAR_TOKEN_MINT}`);
console.log(`   RPC: ${process.env.HELIUS_RPC_URL ? 'Helius' : 'Public'}`);
console.log(`   Target Volume: ${process.env.DAILY_VOLUME_TARGET_SOL || 100} SOL/day\n`);

// Import and run the compiled bot if it exists
try {
  const { InterleavedVolumeChurnBot } = require('./dist/bots/volume/volumeChurnBot');
  
  const config = {
    tokenMint: process.env.FATBEAR_TOKEN_MINT || process.env.TARGET_TOKEN_MINT,
    targetVolume24h: Number(process.env.DAILY_VOLUME_TARGET_SOL) || 100,
    maxConcurrentWallets: 5,
    rotationIntervalHours: 48,
    clusteringThreshold: 0.3,
    enableMixerWallets: false
  };

  const bot = new InterleavedVolumeChurnBot(config);
  
  // Status logging
  setInterval(() => {
    const status = bot.getStatus();
    console.log('\n📊 Volume Churn Status:');
    console.log(`   Active Wallets: ${status.activeWallets}`);
    console.log(`   Pending: ${status.pendingBuys} buys, ${status.pendingSells} sells`);
    console.log(`   24h Volume: ${status.volume24h.toFixed(2)} SOL`);
    console.log(`   Clustering Risk: ${status.clusteringRisk}`);
  }, 30 * 60 * 1000);

  // Start the bot
  bot.startChurning().catch(console.error);
  
} catch (error) {
  console.error('❌ Could not load compiled bot:', error.message);
  console.log('\n📝 Instructions:');
  console.log('1. Run: npx tsc --skipLibCheck');
  console.log('2. Then run this script again: node runVolumeBot.js');
}