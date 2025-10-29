// HootBot/src/bots/volume/volumeBot.ts
// Volume generator for $FATBEAR using only the 5 volume wallets
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

// Get current SOL price (update this regularly)
const SOL_PRICE_USD = 190;

// Configuration calibrated for $FATBEAR
const CONFIG = {
  amounts: {
    minUSD: 5,
    maxUSD: 100,
    get minSOL() { return this.minUSD / SOL_PRICE_USD; },
    get maxSOL() { return this.maxUSD / SOL_PRICE_USD; },
    
    sweetSpotUSD: [10, 20, 25, 50, 75],
    variance: 0.15,
    
    whaleChance: 0.02,
    whaleMinUSD: 75,
    whaleMaxUSD: 100,
  },
  
  timing: {
    minDelayMinutes: 8,
    maxDelayMinutes: 45,
    avgDelayMinutes: 20,
    
    fomoChance: 0.1,
    fomoBurstCount: 2,
    fomoDelayMinutes: 2,
  },
  
  patterns: {
    peakHours: [
      13, 14, 15, 16,    // 9am-12pm EST
      19, 20, 21, 22,    // 3pm-6pm EST
      2, 3,              // 10pm-11pm EST
    ],
    peakMultiplier: 1.3,
  },
  
  safety: {
    maxDailyVolumeUSD: 2000,
    maxSingleTradePercent: 0.5,
    minWalletBalance: 0.2,
    liquidityUSD: 22000,
  },
};

// 5 wallet personalities (no master wallet)
const walletPersonalities = [
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

// Stats tracking
let stats = {
  tradesExecuted: 0,
  totalVolumeSOL: 0,
  totalVolumeUSD: 0,
  dailyVolumeUSD: 0,
  largestTradeUSD: 0,
  walletStats: {} as Record<string, { trades: number; volumeUSD: number; style: string }>,
  lastFomoTime: 0,
  sessionStartTime: Date.now(),
};

// Load only the 5 volume wallets
function loadVolumeWallets(): Keypair[] {
  console.log('💼 Loading volume wallets...');
  const wallets: Keypair[] = [];
  
  // Load the 5 volume wallets
  for (let i = 1; i <= 5; i++) {
    const secretKey = process.env[`RAID_WALLET_${i}`];
    if (secretKey) {
      try {
        const wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
        wallets.push(wallet);
        const personality = walletPersonalities[i-1];
        console.log(`   ✅ Volume ${i} (${personality.name}): ${wallet.publicKey.toString().slice(0, 8)}...`);
        stats.walletStats[wallet.publicKey.toString()] = { 
          trades: 0, 
          volumeUSD: 0,
          style: personality.name 
        };
      } catch (error) {
        console.error(`   ❌ Error loading volume wallet ${i}:`, error);
      }
    }
  }
  
  console.log(`\n📊 Loaded ${wallets.length} volume wallets\n`);
  return wallets;
}

// Get connection
function getConnection(): Connection {
  console.log('🌐 Using public RPC');
  return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}

// Generate human-like trade amount
function generateTradeAmountUSD(walletIndex: number, isFomo: boolean = false): number {
  const personality = walletPersonalities[walletIndex];
  const hour = new Date().getUTCHours();
  
  let amountUSD: number;
  
  if (isFomo) {
    amountUSD = personality.preferredUSD[personality.preferredUSD.length - 1];
    amountUSD *= (1 + Math.random() * 0.3);
  } else {
    const preferred = personality.preferredUSD;
    amountUSD = preferred[Math.floor(Math.random() * preferred.length)];
  }
  
  amountUSD *= (1 + (Math.random() * 2 - 1) * personality.variance);
  
  if (CONFIG.patterns.peakHours.includes(hour)) {
    amountUSD *= CONFIG.patterns.peakMultiplier;
  }
  
  amountUSD = Math.max(CONFIG.amounts.minUSD, Math.min(amountUSD, CONFIG.amounts.maxUSD));
  
  const maxSafeTrade = CONFIG.safety.liquidityUSD * CONFIG.safety.maxSingleTradePercent / 100;
  amountUSD = Math.min(amountUSD, maxSafeTrade);
  
  if (amountUSD < 20) {
    amountUSD = Math.round(amountUSD);
  } else {
    amountUSD = Math.round(amountUSD / 5) * 5;
  }
  
  return amountUSD;
}

// Check for FOMO trigger
function shouldTriggerFomo(): boolean {
  const now = Date.now();
  const timeSinceLastFomo = now - stats.lastFomoTime;
  const minFomoInterval = 60 * 60 * 1000;
  
  if (timeSinceLastFomo < minFomoInterval) return false;
  
  const hour = new Date().getUTCHours();
  const isPeak = CONFIG.patterns.peakHours.includes(hour);
  const fomoChance = isPeak ? CONFIG.timing.fomoChance * 1.5 : CONFIG.timing.fomoChance;
  
  return Math.random() < fomoChance;
}

// Execute trade (TODO: Replace with actual swap)
async function executeTrade(
  wallet: Keypair,
  amountUSD: number,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const amountSOL = amountUSD / SOL_PRICE_USD;
    
    // TODO: Replace with Jupiter/Raydium swap
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 10000,
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

// FOMO burst
async function executeFomoBurst(wallets: Keypair[], connection: Connection) {
  console.log('\n🔥 FOMO BURST TRIGGERED! 🔥');
  stats.lastFomoTime = Date.now();
  
  const burstCount = 2 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < burstCount; i++) {
    const walletIndex = Math.floor(Math.random() * wallets.length);
    const wallet = wallets[walletIndex];
    const personality = walletPersonalities[walletIndex];
    
    const amountUSD = generateTradeAmountUSD(walletIndex, true);
    
    console.log(`   🚀 FOMO Trade ${i + 1}/${burstCount}: $${amountUSD} from ${personality.name}`);
    
    await executeTrade(wallet, amountUSD, connection);
    
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
  console.log(`📊 Market Cap: $37,000`);
  console.log(`💧 Liquidity: $22,000`);
  console.log(`👥 Holders: 211`);
  console.log(`💵 SOL Price: $${SOL_PRICE_USD}`);
  console.log('========================================\n');
  
  const wallets = loadVolumeWallets();
  if (wallets.length < 3) {
    console.error('❌ Need at least 3 wallets!');
    return;
  }
  
  const connection = getConnection();
  
  console.log(`🎯 Token: ${process.env.FATBEAR_TOKEN_MINT}`);
  console.log(`📊 Trade Range: $${CONFIG.amounts.minUSD}-$${CONFIG.amounts.maxUSD}`);
  console.log(`⏰ Frequency: ~${60/CONFIG.timing.avgDelayMinutes} trades/hour`);
  console.log(`🎯 Daily Target: <$${CONFIG.safety.maxDailyVolumeUSD}\n`);
  
  // Check balances
  console.log('💰 Checking wallet balances...');
  let totalBalanceUSD = 0;
  for (let i = 0; i < wallets.length; i++) {
    const balance = await connection.getBalance(wallets[i].publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    const balanceUSD = balanceSOL * SOL_PRICE_USD;
    const personality = walletPersonalities[i];
    console.log(`   ${personality.name}: ${balanceSOL.toFixed(4)} SOL ($${balanceUSD.toFixed(2)})`);
    totalBalanceUSD += balanceUSD;
  }
  console.log(`   📊 Total: $${totalBalanceUSD.toFixed(2)}\n`);
  
  // Main loop
  while (true) {
    try {
      // Check for FOMO
      if (shouldTriggerFomo()) {
        await executeFomoBurst(wallets, connection);
      }
      
      // Select wallet
      const walletIndex = Math.floor(Math.random() * wallets.length);
      const wallet = wallets[walletIndex];
      const personality = walletPersonalities[walletIndex];
      
      // Check balance
      const balance = await connection.getBalance(wallet.publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      
      if (balanceSOL < CONFIG.safety.minWalletBalance) {
        console.log(`⚠️  Skipping ${personality.name} - low balance: ${balanceSOL.toFixed(4)} SOL`);
        // Try another wallet
        continue;
      }
      
      // Generate amount
      const amountUSD = generateTradeAmountUSD(walletIndex);
      const amountSOL = amountUSD / SOL_PRICE_USD;
      
      // Check daily limit
      if (stats.dailyVolumeUSD + amountUSD > CONFIG.safety.maxDailyVolumeUSD) {
        console.log(`📊 Daily limit reached ($${stats.dailyVolumeUSD.toFixed(0)}). Pausing...`);
        await new Promise(resolve => setTimeout(resolve, 3600000));
        continue;
      }
      
      console.log(`\n💸 Trade #${stats.tradesExecuted + 1}`);
      console.log(`   Wallet: ${personality.name} (${wallet.publicKey.toString().slice(0, 8)}...)`);
      console.log(`   Amount: $${amountUSD} (${amountSOL.toFixed(4)} SOL)`);
      console.log(`   Style: ${personality.style}`);
      
      // Execute
      const result = await executeTrade(wallet, amountUSD, connection);
      
      if (result.success) {
        stats.tradesExecuted++;
        stats.totalVolumeSOL += amountSOL;
        stats.totalVolumeUSD += amountUSD;
        stats.dailyVolumeUSD += amountUSD;
        
        if (amountUSD > stats.largestTradeUSD) {
          stats.largestTradeUSD = amountUSD;
        }
        
        const walletKey = wallet.publicKey.toString();
        stats.walletStats[walletKey].trades++;
        stats.walletStats[walletKey].volumeUSD += amountUSD;
        
        console.log(`   ✅ Success!`);
        console.log(`   Daily: $${stats.dailyVolumeUSD.toFixed(0)} | Total: $${stats.totalVolumeUSD.toFixed(0)}`);
        console.log(`   Wallet trades: ${stats.walletStats[walletKey].trades}`);
        if (result.signature) {
          console.log(`   TX: https://solscan.io/tx/${result.signature}`);
        }
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      
      // Calculate delay
      const baseDelay = CONFIG.timing.avgDelayMinutes;
      const variance = 0.5;
      let delayMinutes = baseDelay * (1 - variance + Math.random() * 2 * variance);
      delayMinutes = Math.max(CONFIG.timing.minDelayMinutes, 
                              Math.min(delayMinutes, CONFIG.timing.maxDelayMinutes));
      
      const delayMs = delayMinutes * 60 * 1000;
      const nextTime = new Date(Date.now() + delayMs);
      
      // Show session stats
      const sessionHours = (Date.now() - stats.sessionStartTime) / 3600000;
      const avgPerHour = stats.tradesExecuted / Math.max(0.1, sessionHours);
      
      console.log(`⏰ Next: ${nextTime.toLocaleTimeString()} (${Math.round(delayMinutes)} min)`);
      console.log(`📈 Session: ${avgPerHour.toFixed(1)} trades/hour | Target: $50K mcap\n`);
      
      // Reset daily volume at midnight
      const now = new Date();
      if (now.getHours() === 0 && stats.dailyVolumeUSD > 0) {
        console.log(`🌅 New day! Yesterday's volume: $${stats.dailyVolumeUSD.toFixed(0)}`);
        stats.dailyVolumeUSD = 0;
      }
      
      await new Promise(resolve => setTimeout(resolve, delayMs));
      
    } catch (error) {
      console.error('❌ Error:', error);
      await new Promise(resolve => setTimeout(resolve, 300000));
    }
  }
}

// Start
if (require.main === module) {
  run().catch(console.error);
}