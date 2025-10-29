// HootBot/src/bots/volume/fatbearVolumeBot.ts
// Calibrated volume generator for $FATBEAR ($37K mcap, $22K liquidity)
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';

dotenv.config();

// Get current SOL price (you may want to fetch this dynamically)
const SOL_PRICE_USD = 190; // Update this regularly or fetch from API

// Configuration calibrated for $FATBEAR
const CONFIG = {
  amounts: {
    // Convert USD to SOL amounts
    minUSD: 5,          // $5 minimum
    maxUSD: 100,        // $100 maximum
    get minSOL() { return this.minUSD / SOL_PRICE_USD; },
    get maxSOL() { return this.maxUSD / SOL_PRICE_USD; },
    
    // Special patterns
    sweetSpotUSD: [10, 20, 25, 50, 75], // Common human amounts
    variance: 0.15,     // 15% variance for natural feel
    
    // Whale settings (rare but important)
    whaleChance: 0.02,  // 2% chance
    whaleMinUSD: 75,    // $75-$100 for "whale" trades
    whaleMaxUSD: 100,
  },
  
  timing: {
    // Slower, more organic for small mcap
    minDelayMinutes: 8,    // 8 min minimum
    maxDelayMinutes: 45,   // 45 min maximum  
    avgDelayMinutes: 20,   // Average 20 minutes (3 trades/hour)
    
    // FOMO bursts (critical for growth)
    fomoChance: 0.1,       // 10% chance
    fomoBurstCount: 2,     // 2-3 quick trades
    fomoDelayMinutes: 2,   // 2-5 min between FOMO trades
  },
  
  patterns: {
    // Activity patterns
    peakHours: [
      13, 14, 15, 16,    // 9am-12pm EST (morning activity)
      19, 20, 21, 22,    // 3pm-6pm EST (afternoon pump)
      2, 3,              // 10pm-11pm EST (degen hours)
    ],
    peakMultiplier: 1.3,   // 30% more activity during peak
    
    // Market cap targets for different phases
    mcapTargets: {
      current: 37000,
      shortTerm: 50000,   // Next target: $50K
      midTerm: 100000,    // Mid target: $100K
    },
  },
  
  community: {
    // Track community mood
    telegramActive: 200,   // ~200 active members
    growthPhase: 'early',  // early | growing | mature
    jeetRisk: 'medium',    // Jeets watching the chart
  },
  
  safety: {
    maxDailyVolumeUSD: 2000,     // Don't exceed $2K daily
    maxSingleTradePercent: 0.5,   // Max 0.5% of liquidity per trade
    minWalletBalance: 0.2,        // Keep 0.2 SOL for fees
    liquidityUSD: 22000,          // Current liquidity
  },
};

// Wallet personalities calibrated for organic growth
const walletPersonalities = [
  { 
    name: 'Accumulator',
    style: 'consistent',
    preferredUSD: [20, 25, 30],
    variance: 0.1 
  },
  { 
    name: 'Degen',
    style: 'sporadic',
    preferredUSD: [10, 50, 75],
    variance: 0.25 
  },
  { 
    name: 'Normie',
    style: 'cautious',
    preferredUSD: [5, 10, 15, 20],
    variance: 0.15 
  },
  { 
    name: 'Smart Money',
    style: 'strategic',
    preferredUSD: [25, 50, 75],
    variance: 0.05 
  },
  { 
    name: 'FOMO Buyer',
    style: 'emotional',
    preferredUSD: [15, 30, 100],
    variance: 0.3 
  },
  { 
    name: 'DCA Bot',
    style: 'methodical',
    preferredUSD: [20, 20, 20],
    variance: 0.05 
  },
];

// Enhanced stats
let stats = {
  tradesExecuted: 0,
  totalVolumeSOL: 0,
  totalVolumeUSD: 0,
  dailyVolumeUSD: 0,
  largestTradeUSD: 0,
  walletStats: {} as Record<string, { trades: number; volumeUSD: number; style: string }>,
  lastFomoTime: 0,
};

// Load wallets
function loadWallets(): Keypair[] {
  console.log('💼 Loading wallets...');
  const wallets: Keypair[] = [];
  
  // Load master wallet
  const masterWalletPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (masterWalletPath && fs.existsSync(masterWalletPath)) {
    try {
      const keypairData = JSON.parse(fs.readFileSync(masterWalletPath, 'utf-8'));
      const masterWallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
      wallets.push(masterWallet);
      console.log(`   ✅ Master: ${masterWallet.publicKey.toString().slice(0, 8)}...`);
    } catch (error) {
      console.error('   ❌ Error loading master wallet:', error);
    }
  }
  
  // Load raid wallets
  for (let i = 1; i <= 5; i++) {
    const secretKey = process.env[`RAID_WALLET_${i}`];
    if (secretKey) {
      try {
        const wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
        wallets.push(wallet);
        const personality = walletPersonalities[i];
        console.log(`   ✅ Raid ${i} (${personality.name}): ${wallet.publicKey.toString().slice(0, 8)}...`);
        stats.walletStats[wallet.publicKey.toString()] = { 
          trades: 0, 
          volumeUSD: 0,
          style: personality.name 
        };
      } catch (error) {
        console.error(`   ❌ Error loading raid wallet ${i}:`, error);
      }
    }
  }
  
  console.log(`\n📊 Loaded ${wallets.length} wallets\n`);
  return wallets;
}

// Get connection with fallback
function getConnection(): Connection {
  // Always use public RPC for now (Helius auth issues)
  console.log('🌐 Using public RPC');
  return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}

// Generate human-like trade amount in USD
function generateTradeAmountUSD(walletIndex: number, isFomo: boolean = false): number {
  const personality = walletPersonalities[walletIndex] || walletPersonalities[0];
  const hour = new Date().getUTCHours();
  
  let amountUSD: number;
  
  if (isFomo) {
    // FOMO trades are more aggressive
    amountUSD = personality.preferredUSD[personality.preferredUSD.length - 1];
    amountUSD *= (1 + Math.random() * 0.3); // Up to 30% more during FOMO
  } else {
    // Normal trades pick from preferred amounts
    const preferred = personality.preferredUSD;
    amountUSD = preferred[Math.floor(Math.random() * preferred.length)];
  }
  
  // Apply personality variance
  amountUSD *= (1 + (Math.random() * 2 - 1) * personality.variance);
  
  // Peak hour boost
  if (CONFIG.patterns.peakHours.includes(hour)) {
    amountUSD *= CONFIG.patterns.peakMultiplier;
  }
  
  // Ensure within bounds
  amountUSD = Math.max(CONFIG.amounts.minUSD, Math.min(amountUSD, CONFIG.amounts.maxUSD));
  
  // Safety check: don't exceed liquidity limits
  const maxSafeTrade = CONFIG.safety.liquidityUSD * CONFIG.safety.maxSingleTradePercent / 100;
  amountUSD = Math.min(amountUSD, maxSafeTrade);
  
  // Round to nice numbers
  if (amountUSD < 20) {
    amountUSD = Math.round(amountUSD); // $5, $10, $15
  } else {
    amountUSD = Math.round(amountUSD / 5) * 5; // $20, $25, $30, etc.
  }
  
  return amountUSD;
}

// Check if we should trigger FOMO burst
function shouldTriggerFomo(): boolean {
  const now = Date.now();
  const timeSinceLastFomo = now - stats.lastFomoTime;
  const minFomoInterval = 60 * 60 * 1000; // 1 hour minimum between FOMO bursts
  
  if (timeSinceLastFomo < minFomoInterval) return false;
  
  // Higher chance during peak hours
  const hour = new Date().getUTCHours();
  const isPeak = CONFIG.patterns.peakHours.includes(hour);
  const fomoChance = isPeak ? CONFIG.timing.fomoChance * 1.5 : CONFIG.timing.fomoChance;
  
  return Math.random() < fomoChance;
}

// Execute actual trade (TODO: Integrate with Jupiter/Raydium)
async function executeTrade(
  wallet: Keypair,
  amountUSD: number,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // Convert USD to SOL
    const amountSOL = amountUSD / SOL_PRICE_USD;
    const amountLamports = Math.floor(amountSOL * LAMPORTS_PER_SOL);
    
    // TODO: Replace with actual Jupiter/Raydium swap
    // For now, just do a self-transfer to verify wallet works
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 10000, // 0.00001 SOL for testing
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [wallet], {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    });
    
    await connection.confirmTransaction(signature, 'confirmed');
    
    return { success: true, signature };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Execute FOMO burst
async function executeFomoBurst(wallets: Keypair[], connection: Connection) {
  console.log('\n🔥 FOMO BURST TRIGGERED! 🔥');
  stats.lastFomoTime = Date.now();
  
  const burstCount = 2 + Math.floor(Math.random() * 2); // 2-3 trades
  
  for (let i = 0; i < burstCount; i++) {
    // Select random wallet (prefer different ones)
    const walletIndex = Math.floor(Math.random() * wallets.length);
    const wallet = wallets[walletIndex];
    const walletName = walletIndex === 0 ? 'Master' : `Raid ${walletIndex}`;
    
    // Generate FOMO amount (larger than normal)
    const amountUSD = generateTradeAmountUSD(walletIndex, true);
    
    console.log(`   🚀 FOMO Trade ${i + 1}/${burstCount}: $${amountUSD} from ${walletName}`);
    
    // Execute trade
    await executeTrade(wallet, amountUSD, connection);
    
    // Short delay between FOMO trades
    if (i < burstCount - 1) {
      const delay = CONFIG.timing.fomoDelayMinutes * 60 * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('   ✅ FOMO burst complete!\n');
}

// Main loop
async function run() {
  console.log('🦉 HootBot Volume Generator for $FATBEAR');
  console.log('========================================');
  console.log(`📊 Market Cap: $${CONFIG.patterns.mcapTargets.current.toLocaleString()}`);
  console.log(`💧 Liquidity: $${CONFIG.safety.liquidityUSD.toLocaleString()}`);
  console.log(`👥 Holders: 211`);
  console.log(`💵 SOL Price: $${SOL_PRICE_USD}`);
  console.log('========================================\n');
  
  const wallets = loadWallets();
  if (wallets.length < 2) {
    console.error('❌ Need at least 2 wallets!');
    return;
  }
  
  const connection = getConnection();
  
  console.log(`🎯 Token: ${process.env.FATBEAR_TOKEN_MINT}`);
  console.log(`📊 Trade Range: $${CONFIG.amounts.minUSD}-$${CONFIG.amounts.maxUSD}`);
  console.log(`⏰ Frequency: ~${60/CONFIG.timing.avgDelayMinutes} trades/hour`);
  console.log(`🎯 Daily Target: <$${CONFIG.safety.maxDailyVolumeUSD}\n`);
  
  // Check balances
  console.log('💰 Checking wallet balances...');
  for (let i = 0; i < wallets.length; i++) {
    const balance = await connection.getBalance(wallets[i].publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    const balanceUSD = balanceSOL * SOL_PRICE_USD;
    const name = i === 0 ? 'Master' : walletPersonalities[i].name;
    console.log(`   ${name}: ${balanceSOL.toFixed(4)} SOL ($${balanceUSD.toFixed(2)})`);
  }
  console.log('');
  
  // Main trading loop
  while (true) {
    try {
      // Check for FOMO opportunity
      if (shouldTriggerFomo()) {
        await executeFomoBurst(wallets, connection);
      }
      
      // Normal trade flow
      const walletIndex = Math.floor(Math.random() * wallets.length);
      const wallet = wallets[walletIndex];
      const personality = walletPersonalities[walletIndex] || walletPersonalities[0];
      
      // Check balance
      const balance = await connection.getBalance(wallet.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      
      if (balanceSOL < CONFIG.safety.minWalletBalance) {
        console.log(`⚠️  Low balance in ${personality.name}: ${balanceSOL.toFixed(4)} SOL`);
        await new Promise(resolve => setTimeout(resolve, 300000)); // Wait 5 min
        continue;
      }
      
      // Generate trade amount
      const amountUSD = generateTradeAmountUSD(walletIndex);
      const amountSOL = amountUSD / SOL_PRICE_USD;
      
      // Check daily limit
      if (stats.dailyVolumeUSD + amountUSD > CONFIG.safety.maxDailyVolumeUSD) {
        console.log(`📊 Daily volume limit reached ($${stats.dailyVolumeUSD.toFixed(0)}). Waiting...`);
        await new Promise(resolve => setTimeout(resolve, 3600000)); // Wait 1 hour
        continue;
      }
      
      console.log(`\n💸 Trade #${stats.tradesExecuted + 1}`);
      console.log(`   Wallet: ${personality.name} (${wallet.publicKey.toString().slice(0, 8)}...)`);
      console.log(`   Amount: $${amountUSD} (${amountSOL.toFixed(4)} SOL)`);
      console.log(`   Style: ${personality.style}`);
      
      // Execute trade
      const result = await executeTrade(wallet, amountUSD, connection);
      
      if (result.success) {
        // Update stats
        stats.tradesExecuted++;
        stats.totalVolumeSOL += amountSOL;
        stats.totalVolumeUSD += amountUSD;
        stats.dailyVolumeUSD += amountUSD;
        
        if (amountUSD > stats.largestTradeUSD) {
          stats.largestTradeUSD = amountUSD;
        }
        
        const walletKey = wallet.publicKey.toString();
        if (!stats.walletStats[walletKey]) {
          stats.walletStats[walletKey] = { 
            trades: 0, 
            volumeUSD: 0, 
            style: personality.name 
          };
        }
        stats.walletStats[walletKey].trades++;
        stats.walletStats[walletKey].volumeUSD += amountUSD;
        
        console.log(`   ✅ Success!`);
        console.log(`   Daily: $${stats.dailyVolumeUSD.toFixed(0)} | Total: $${stats.totalVolumeUSD.toFixed(0)}`);
        if (result.signature) {
          console.log(`   TX: https://solscan.io/tx/${result.signature}`);
        }
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      
      // Calculate next delay
      const baseDelay = CONFIG.timing.avgDelayMinutes;
      const variance = 0.5; // 50% variance
      let delayMinutes = baseDelay * (1 - variance + Math.random() * 2 * variance);
      delayMinutes = Math.max(CONFIG.timing.minDelayMinutes, 
                              Math.min(delayMinutes, CONFIG.timing.maxDelayMinutes));
      
      const delayMs = delayMinutes * 60 * 1000;
      const nextTime = new Date(Date.now() + delayMs);
      
      console.log(`⏰ Next trade: ${nextTime.toLocaleTimeString()} (${Math.round(delayMinutes)} min)`);
      console.log(`📈 Progress to $50K mcap: ${((37000/50000) * 100).toFixed(1)}%\n`);
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (error) {
      console.error('❌ Error:', error);
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 min
    }
  }
}

// Export for monitoring
export function getStats() {
  return {
    ...stats,
    avgTradeUSD: stats.totalVolumeUSD / Math.max(1, stats.tradesExecuted),
    tradesPerHour: stats.tradesExecuted / ((Date.now() - stats.lastFomoTime) / 3600000),
  };
}

// Start if run directly
if (require.main === module) {
  run().catch(console.error);
}