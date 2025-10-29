#!/bin/bash
# HootBot/createVolumeBot.sh
# Script to create the multi-wallet volume bot files

echo "🦉 Creating Multi-Wallet Volume Bot Files"
echo "========================================"
echo ""

# Create volumeGenerator.ts (multi-wallet version)
echo "📝 Creating src/bots/volume/volumeGenerator.ts..."
cat > src/bots/volume/volumeGenerator.ts << 'EOF'
// HootBot/src/bots/volume/volumeGenerator.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';
import { executeBuy } from '../raid/tradeExecutor';
import { VOLUME_CONFIG } from '../config/volumeConfig';

dotenv.config();

// Statistics tracking
let volumeStats = {
  tradesExecuted: 0,
  totalVolume: 0,
  lastTradeTime: Date.now(),
  dailyVolume: 0,
  dailyReset: new Date().setHours(0, 0, 0, 0),
  walletStats: {} as Record<string, { trades: number; volume: number }>,
};

// Load all raid wallets from environment
function loadRaidWallets(): Keypair[] {
  console.log('💼 Loading raid wallets...');
  const wallets: Keypair[] = [];
  
  // Load master wallet first
  const masterWalletPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (masterWalletPath) {
    try {
      const keypairData = JSON.parse(fs.readFileSync(masterWalletPath, 'utf-8'));
      const masterWallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
      wallets.push(masterWallet);
      console.log(`   ✅ Master wallet: ${masterWallet.publicKey.toString().slice(0, 8)}...`);
    } catch (error) {
      console.error('   ❌ Error loading master wallet:', error);
    }
  }
  
  // Load 5 raid wallets
  for (let i = 1; i <= 5; i++) {
    const secretKey = process.env[`RAID_WALLET_${i}`];
    if (secretKey) {
      try {
        const wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
        wallets.push(wallet);
        console.log(`   ✅ Raid wallet ${i}: ${wallet.publicKey.toString().slice(0, 8)}...`);
        
        // Initialize stats for this wallet
        volumeStats.walletStats[wallet.publicKey.toString()] = { trades: 0, volume: 0 };
      } catch (error) {
        console.error(`   ❌ Error loading raid wallet ${i}:`, error);
      }
    }
  }
  
  console.log(`\n📊 Loaded ${wallets.length} wallets total`);
  return wallets;
}

// Get connection with fallback
function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  
  if (heliusKey && heliusKey !== 'your_key' && heliusKey !== '') {
    return new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
      'confirmed'
    );
  }
  
  return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}

// Select wallet using intelligent rotation
function selectWallet(wallets: Keypair[]): Keypair {
  // 70% chance to use a raid wallet, 30% master wallet
  const useMasterWallet = Math.random() < 0.3;
  
  if (useMasterWallet && wallets.length > 0) {
    return wallets[0]; // Master wallet is first
  }
  
  // Select from raid wallets (skip master at index 0)
  const raidWallets = wallets.slice(1);
  if (raidWallets.length === 0) return wallets[0]; // Fallback to master
  
  // Weight selection based on recent usage (prefer less used wallets)
  const walletScores = raidWallets.map(wallet => {
    const stats = volumeStats.walletStats[wallet.publicKey.toString()];
    const recentTrades = stats?.trades || 0;
    // Lower score = more likely to be selected
    return { wallet, score: recentTrades };
  });
  
  // Sort by score (least used first)
  walletScores.sort((a, b) => a.score - b.score);
  
  // Weighted selection - prefer less used wallets
  const weights = walletScores.map((_, index) => Math.pow(2, walletScores.length - index));
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return walletScores[i].wallet;
    }
  }
  
  return walletScores[0].wallet; // Fallback
}

// Generate natural-looking trade amount with wallet personality
function generateTradeAmount(walletIndex: number): number {
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  
  // Each wallet has slightly different trading patterns
  const walletPersonality = {
    0: { min: 0.002, max: 0.015, variance: 0.2 },    // Master: slightly larger
    1: { min: 0.001, max: 0.008, variance: 0.15 },   // Raid 1: conservative
    2: { min: 0.001, max: 0.012, variance: 0.25 },   // Raid 2: more variable
    3: { min: 0.001, max: 0.01, variance: 0.1 },     // Raid 3: consistent
    4: { min: 0.002, max: 0.009, variance: 0.18 },   // Raid 4: mid-range
    5: { min: 0.001, max: 0.011, variance: 0.22 },   // Raid 5: aggressive
  };
  
  const personality = walletPersonality[walletIndex] || walletPersonality[0];
  
  // Base amount with personality
  let baseAmount = personality.min + 
    (Math.random() * (personality.max - personality.min));
  
  // Apply personality variance
  baseAmount *= (1 + (Math.random() * 2 - 1) * personality.variance);
  
  // Peak hour boost
  if (VOLUME_CONFIG.patterns.peakHours.includes(hour)) {
    baseAmount *= VOLUME_CONFIG.patterns.peakMultiplier;
  }
  
  // Weekend reduction
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    baseAmount *= VOLUME_CONFIG.patterns.weekendMultiplier;
  }
  
  // Occasional larger buy (whale simulation)
  if (Math.random() < VOLUME_CONFIG.amounts.whaleProbability) {
    baseAmount *= VOLUME_CONFIG.amounts.whaleMultiplier;
    console.log('🐋 Whale buy triggered!');
  }
  
  return Math.max(0.001, Math.min(baseAmount, 0.02));
}

// Generate delay with wallet-specific patterns
function generateDelay(walletIndex: number): number {
  const { minDelayMinutes, maxDelayMinutes, avgDelayMinutes } = VOLUME_CONFIG.timing;
  
  // Each wallet has slightly different timing preferences
  const timingMultiplier = 0.8 + (walletIndex * 0.1); // 0.8x to 1.3x
  
  // Exponential distribution for natural timing
  const lambda = 1 / (avgDelayMinutes * timingMultiplier);
  let delay = -Math.log(1 - Math.random()) / lambda;
  
  // Bound the delay
  delay = Math.max(minDelayMinutes, Math.min(delay, maxDelayMinutes));
  
  // Convert to milliseconds
  return delay * 60 * 1000;
}

// Execute a single volume trade with wallet selection
export async function executeVolumeTrade(wallets: Keypair[]): Promise<boolean> {
  const tokenMint = process.env.FATBEAR_TOKEN_MINT;
  if (!tokenMint) {
    console.error('❌ No FATBEAR token mint configured!');
    return false;
  }
  
  const connection = getConnection();
  
  // Select wallet for this trade
  const wallet = selectWallet(wallets);
  const walletIndex = wallets.findIndex(w => w.publicKey.equals(wallet.publicKey));
  const walletName = walletIndex === 0 ? 'Master' : `Raid ${walletIndex}`;
  
  // Check wallet balance
  const balance = await connection.getBalance(wallet.publicKey);
  const balanceInSol = balance / LAMPORTS_PER_SOL;
  
  if (balanceInSol < VOLUME_CONFIG.targets.minWalletBalance) {
    console.error(`❌ Low balance in ${walletName} wallet: ${balanceInSol.toFixed(4)} SOL`);
    return false;
  }
  
  // Generate trade amount based on wallet personality
  const amount = generateTradeAmount(walletIndex);
  
  console.log(`\n💫 Volume Trade #${volumeStats.tradesExecuted + 1}`);
  console.log(`   Wallet: ${walletName} (${wallet.publicKey.toString().slice(0, 8)}...)`);
  console.log(`   Amount: ${amount.toFixed(4)} SOL`);
  console.log(`   Balance: ${balanceInSol.toFixed(4)} SOL`);
  console.log(`   Time: ${new Date().toLocaleTimeString()}`);
  
  try {
    // Execute buy (always skip MIND for our own token)
    const result = await executeBuy(
      tokenMint,
      amount,
      wallet,
      connection,
      true // skipMindAnalysis
    );
    
    if (result.success) {
      // Update statistics
      volumeStats.tradesExecuted++;
      volumeStats.totalVolume += amount;
      volumeStats.dailyVolume += amount;
      volumeStats.lastTradeTime = Date.now();
      
      // Update wallet-specific stats
      const walletKey = wallet.publicKey.toString();
      if (!volumeStats.walletStats[walletKey]) {
        volumeStats.walletStats[walletKey] = { trades: 0, volume: 0 };
      }
      volumeStats.walletStats[walletKey].trades++;
      volumeStats.walletStats[walletKey].volume += amount;
      
      console.log(`✅ Trade successful!`);
      console.log(`   Daily volume: ${volumeStats.dailyVolume.toFixed(4)} SOL`);
      console.log(`   Total trades: ${volumeStats.tradesExecuted}`);
      console.log(`   ${walletName} trades: ${volumeStats.walletStats[walletKey].trades}`);
      
      // Log transaction for tracking
      if (result.signature) {
        console.log(`   TX: https://solscan.io/tx/${result.signature}`);
      }
      
      return true;
    } else {
      console.error(`❌ Trade failed: ${result.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Trade error:', error);
    return false;
  }
}

// Main multi-wallet volume generation loop
export async function runVolumeGenerator(): Promise<void> {
  console.log('🦉 HootBot Multi-Wallet Volume Generator');
  console.log('========================================');
  
  // Load all wallets
  const wallets = loadRaidWallets();
  
  if (wallets.length < 2) {
    console.error('❌ Need at least 2 wallets for multi-wallet operation!');
    return;
  }
  
  console.log(`\n📊 Configuration:`);
  console.log(`Target daily volume: ${VOLUME_CONFIG.targets.dailyVolume} SOL`);
  console.log(`Trade size: ${VOLUME_CONFIG.amounts.min}-${VOLUME_CONFIG.amounts.max} SOL`);
  console.log(`Average delay: ${VOLUME_CONFIG.timing.avgDelayMinutes} minutes`);
  console.log(`Active wallets: ${wallets.length}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Check all wallet balances
  console.log('💰 Checking wallet balances...');
  const connection = getConnection();
  for (let i = 0; i < wallets.length; i++) {
    const balance = await connection.getBalance(wallets[i].publicKey);
    const walletName = i === 0 ? 'Master' : `Raid ${i}`;
    console.log(`   ${walletName}: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  }
  console.log('');
  
  // Reset daily stats at midnight
  setInterval(() => {
    const now = new Date();
    if (now.setHours(0, 0, 0, 0) > volumeStats.dailyReset) {
      console.log('\n📊 Daily stats reset');
      console.log(`Yesterday's volume: ${volumeStats.dailyVolume.toFixed(4)} SOL`);
      
      // Show wallet distribution
      console.log('Wallet activity:');
      Object.entries(volumeStats.walletStats).forEach(([key, stats]) => {
        console.log(`   ${key.slice(0, 8)}...: ${stats.trades} trades, ${stats.volume.toFixed(4)} SOL`);
      });
      
      volumeStats.dailyVolume = 0;
      volumeStats.dailyReset = now.setHours(0, 0, 0, 0);
      // Reset wallet stats
      Object.keys(volumeStats.walletStats).forEach(key => {
        volumeStats.walletStats[key] = { trades: 0, volume: 0 };
      });
    }
  }, 60000); // Check every minute
  
  let lastWalletIndex = 0;
  
  // Main loop
  while (true) {
    try {
      // Execute trade
      const success = await executeVolumeTrade(wallets);
      
      // Determine next delay based on the wallet that was used
      let delay = generateDelay(lastWalletIndex);
      
      // Consecutive buy chance (FOMO simulation) - sometimes same wallet buys again
      if (success && Math.random() < VOLUME_CONFIG.timing.consecutiveBuyChance) {
        const { min, max } = VOLUME_CONFIG.timing.fomoDelaySeconds;
        delay = (min + Math.random() * (max - min)) * 1000;
        console.log('⚡ FOMO mode: Same wallet might buy again...');
      }
      
      // Show next trade time
      const nextTradeTime = new Date(Date.now() + delay);
      console.log(`⏰ Next trade at: ${nextTradeTime.toLocaleTimeString()}`);
      console.log(`   (in ${Math.round(delay / 60000)} minutes)\n`);
      
      // Wait for next trade
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      console.error('❌ Volume generator error:', error);
      // Wait 5 minutes on error
      await new Promise(resolve => setTimeout(resolve, 300000));
    }
  }
}

// Get enhanced volume stats including wallet distribution
export function getVolumeStats() {
  return {
    ...volumeStats,
    uptime: Date.now() - volumeStats.lastTradeTime,
    averageTradeSize: volumeStats.totalVolume / Math.max(1, volumeStats.tradesExecuted),
    walletDistribution: Object.entries(volumeStats.walletStats).map(([wallet, stats]) => ({
      wallet: wallet.slice(0, 8) + '...',
      trades: stats.trades,
      volume: stats.volume,
      percentage: (stats.volume / Math.max(0.001, volumeStats.totalVolume)) * 100
    }))
  };
}

// Direct execution
if (require.main === module) {
  runVolumeGenerator()
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
EOF

# Create volumeMonitor.ts
echo "📝 Creating src/bots/volume/volumeMonitor.ts..."
cat > src/bots/volume/volumeMonitor.ts << 'EOF'
// HootBot/src/bots/volume/volumeMonitor.ts
import { getVolumeStats } from './volumeGenerator';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

export async function monitorVolume() {
  console.clear();
  console.log(`${colors.cyan}${colors.bright}🦉 HootBot Volume Monitor${colors.reset}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Get volume stats
    const stats = getVolumeStats();
    
    // Calculate metrics
    const avgTradeSize = stats.averageTradeSize || 0;
    const tradesPerHour = stats.tradesExecuted / (stats.uptime / 3600000);
    const projectedDaily = tradesPerHour * 24 * avgTradeSize;
    
    // Display stats
    console.log(`${colors.bright}📊 Trading Statistics${colors.reset}`);
    console.log(`Total Trades: ${colors.blue}${stats.tradesExecuted}${colors.reset}`);
    console.log(`Total Volume: ${colors.blue}${stats.totalVolume.toFixed(4)} SOL${colors.reset}`);
    console.log(`Daily Volume: ${colors.blue}${stats.dailyVolume.toFixed(4)} SOL${colors.reset}`);
    console.log(`Avg Trade Size: ${colors.blue}${avgTradeSize.toFixed(4)} SOL${colors.reset}\n`);
    
    console.log(`${colors.bright}📈 Performance Metrics${colors.reset}`);
    console.log(`Trades/Hour: ${colors.yellow}${tradesPerHour.toFixed(1)}${colors.reset}`);
    console.log(`Projected Daily: ${colors.yellow}${projectedDaily.toFixed(2)} SOL${colors.reset}\n`);
    
    // Wallet distribution
    if (stats.walletDistribution && stats.walletDistribution.length > 0) {
      console.log(`${colors.bright}💼 Wallet Distribution${colors.reset}`);
      stats.walletDistribution.forEach(w => {
        console.log(`${w.wallet}: ${w.trades} trades (${w.percentage.toFixed(1)}%)`);
      });
      console.log('');
    }
    
    // Last trade info
    const timeSinceLastTrade = Date.now() - stats.lastTradeTime;
    const minutesSinceLast = Math.floor(timeSinceLastTrade / 60000);
    console.log(`Last Trade: ${colors.cyan}${minutesSinceLast} minutes ago${colors.reset}\n`);
    
    // Status indicator
    if (minutesSinceLast > 20) {
      console.log(`${colors.red}⚠️  Bot may be stalled${colors.reset}`);
    } else if (stats.dailyVolume >= 1.0) {
      console.log(`${colors.green}✅ Daily target reached!${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Bot running normally${colors.reset}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Press Ctrl+C to exit monitor');
    
  } catch (error) {
    console.error(`${colors.red}Error reading stats:${colors.reset}`, error);
  }
}

// Update every 30 seconds
async function runMonitor() {
  while (true) {
    await monitorVolume();
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

// Run if called directly
if (require.main === module) {
  runMonitor().catch(console.error);
}
EOF

# Create volumeConfig.ts
echo "📝 Creating src/bots/config/volumeConfig.ts..."
cat > src/bots/config/volumeConfig.ts << 'EOF'
// HootBot/src/bots/config/volumeConfig.ts
// Configuration for the volume generation bot

export const VOLUME_CONFIG = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💰 TRADE AMOUNTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  amounts: {
    min: 0.001,           // Minimum trade size (SOL)
    max: 0.01,            // Maximum trade size (SOL)
    variance: 0.15,       // 15% variance on all trades
    whaleProbability: 0.05, // 5% chance for 2x size trade
    whaleMultiplier: 2,   // Whale trades are 2x normal size
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⏰ TIMING CONFIGURATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  timing: {
    minDelayMinutes: 3,   // Minimum time between trades
    maxDelayMinutes: 15,  // Maximum time between trades
    avgDelayMinutes: 8,   // Average delay (for exponential distribution)
    
    // FOMO patterns
    consecutiveBuyChance: 0.15,  // 15% chance for quick follow-up
    fomoDelaySeconds: {
      min: 30,
      max: 90,
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📈 MARKET PATTERNS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  patterns: {
    // Peak trading hours (UTC)
    peakHours: [
      14, 15, 16,  // 9-11 AM EST
      20, 21, 22,  // 3-5 PM EST
    ],
    peakMultiplier: 1.5,     // 50% more activity during peak
    weekendMultiplier: 0.7,  // 30% less activity on weekends
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎯 TARGETS & LIMITS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  targets: {
    dailyVolume: 1.0,        // Target 1 SOL daily volume
    maxDailyVolume: 2.0,     // Never exceed 2 SOL daily
    minWalletBalance: 0.1,   // Keep 0.1 SOL for fees
  },
};
EOF

# Create index.ts for volume module
echo "📝 Creating src/bots/volume/index.ts..."
cat > src/bots/volume/index.ts << 'EOF'
// HootBot/src/bots/volume/index.ts
export { runVolumeGenerator, executeVolumeTrade, getVolumeStats } from './volumeGenerator';
export { monitorVolume } from './volumeMonitor';
export { VOLUME_CONFIG } from '../config/volumeConfig';
EOF

echo ""
echo "✅ All volume bot files created!"
echo ""
echo "📂 Files created:"
echo "  ✅ src/bots/volume/volumeGenerator.ts (multi-wallet version)"
echo "  ✅ src/bots/volume/volumeMonitor.ts"
echo "  ✅ src/bots/config/volumeConfig.ts"
echo "  ✅ src/bots/volume/index.ts"
echo ""
echo "📋 Next steps:"
echo "1. Build the project:"
echo "   npm run build"
echo ""
echo "2. Run the volume bot:"
echo "   ./startVolume.sh"
echo ""
echo "3. Monitor in another terminal:"
echo "   node dist/bots/volume/volumeMonitor.js"