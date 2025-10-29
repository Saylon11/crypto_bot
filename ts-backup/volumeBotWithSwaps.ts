// HootBot/src/bots/volume/volumeBotWithSwaps.ts
// Volume generator with real Jupiter/Raydium swaps for $FATBEAR
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';
import fetch from 'node-fetch';

dotenv.config();

// Constants
const SOL_PRICE_USD = 190;
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Configuration
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
    peakHours: [13, 14, 15, 16, 19, 20, 21, 22, 2, 3],
    peakMultiplier: 1.3,
  },
  safety: {
    maxDailyVolumeUSD: 2000,
    maxSingleTradePercent: 0.5,
    minWalletBalance: 0.2,
    liquidityUSD: 22000,
    slippageBps: 300, // 3% slippage
  },
};

// Wallet personalities
const walletPersonalities = [
  { name: 'Degen', style: 'sporadic', preferredUSD: [10, 50, 75], variance: 0.25 },
  { name: 'Normie', style: 'cautious', preferredUSD: [5, 10, 15, 20], variance: 0.15 },
  { name: 'Smart Money', style: 'strategic', preferredUSD: [25, 50, 75], variance: 0.05 },
  { name: 'FOMO Buyer', style: 'emotional', preferredUSD: [15, 30, 100], variance: 0.3 },
  { name: 'DCA Bot', style: 'methodical', preferredUSD: [20, 20, 20], variance: 0.05 },
];

// Stats
let stats = {
  tradesExecuted: 0,
  totalVolumeSOL: 0,
  totalVolumeUSD: 0,
  dailyVolumeUSD: 0,
  successfulTrades: 0,
  failedTrades: 0,
  walletStats: {} as Record<string, { trades: number; volumeUSD: number; tokens: number }>,
  lastFomoTime: 0,
  sessionStartTime: Date.now(),
};

// Load volume wallets
function loadVolumeWallets(): Keypair[] {
  console.log('💼 Loading volume wallets...');
  const wallets: Keypair[] = [];
  
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
          tokens: 0
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

// Execute Jupiter swap
async function executeJupiterSwap(
  tokenMint: string,
  amountSol: number,
  wallet: Keypair,
  connection: Connection
): Promise<{ success: boolean; signature?: string; tokensReceived?: number; error?: string }> {
  try {
    console.log(`\n🪐 Executing Jupiter swap:`);
    console.log(`   Amount: ${amountSol.toFixed(4)} SOL ($${(amountSol * SOL_PRICE_USD).toFixed(0)})`);
    
    // Get quote
    console.log(`   Getting quote...`);
    const quoteResponse = await fetch(
      `${JUPITER_QUOTE_API}/quote?` +
      `inputMint=${SOL_MINT}&` +
      `outputMint=${tokenMint}&` +
      `amount=${Math.floor(amountSol * LAMPORTS_PER_SOL)}&` +
      `slippageBps=${CONFIG.safety.slippageBps}`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(`Quote failed: ${await quoteResponse.text()}`);
    }
    
    const quoteData = await quoteResponse.json();
    const outputAmount = parseFloat(quoteData.outAmount);
    const priceImpact = parseFloat(quoteData.priceImpactPct);
    
    console.log(`   Expected tokens: ${(outputAmount / 1_000_000).toFixed(0)} $FATBEAR`);
    console.log(`   Price impact: ${priceImpact.toFixed(2)}%`);
    
    // Price impact check
    if (priceImpact > 5) {
      console.log(`   ⚠️  High price impact! Reducing trade size...`);
      return { 
        success: false, 
        error: `Price impact too high: ${priceImpact.toFixed(2)}%` 
      };
    }
    
    // Get swap transaction
    console.log(`   Building transaction...`);
    const swapResponse = await fetch(`${JUPITER_QUOTE_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: 20000, // Priority fee
        dynamicComputeUnitLimit: true,
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(`Swap failed: ${await swapResponse.text()}`);
    }
    
    const swapData = await swapResponse.json();
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Sign and send
    console.log(`   Signing transaction...`);
    transaction.sign([wallet]);
    
    console.log(`   Sending transaction...`);
    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2
    });
    
    console.log(`   ✅ Sent! Signature: ${signature.slice(0, 8)}...`);
    
    // Wait for confirmation
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    }, 'confirmed');
    
    return {
      success: true,
      signature,
      tokensReceived: outputAmount / 1_000_000
    };
    
  } catch (error) {
    console.error(`   ❌ Swap error:`, error instanceof Error ? error.message : error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Generate trade amount
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

// FOMO burst
async function executeFomoBurst(wallets: Keypair[], connection: Connection, tokenMint: string) {
  console.log('\n🔥 FOMO BURST TRIGGERED! 🔥');
  stats.lastFomoTime = Date.now();
  
  const burstCount = 2 + Math.floor(Math.random() * 2);
  
  for (let i = 0; i < burstCount; i++) {
    const walletIndex = Math.floor(Math.random() * wallets.length);
    const wallet = wallets[walletIndex];
    const personality = walletPersonalities[walletIndex];
    
    const amountUSD = generateTradeAmountUSD(walletIndex, true);
    const amountSOL = amountUSD / SOL_PRICE_USD;
    
    console.log(`\n   🚀 FOMO Trade ${i + 1}/${burstCount}: $${amountUSD} from ${personality.name}`);
    
    const result = await executeJupiterSwap(tokenMint, amountSOL, wallet, connection);
    
    if (result.success) {
      stats.successfulTrades++;
      stats.totalVolumeSOL += amountSOL;
      stats.totalVolumeUSD += amountUSD;
      stats.dailyVolumeUSD += amountUSD;
      
      const walletKey = wallet.publicKey.toString();
      stats.walletStats[walletKey].trades++;
      stats.walletStats[walletKey].volumeUSD += amountUSD;
      stats.walletStats[walletKey].tokens += result.tokensReceived || 0;
      
      console.log(`   ✅ Success! Got ${result.tokensReceived?.toFixed(0)} $FATBEAR`);
      console.log(`   TX: https://solscan.io/tx/${result.signature}`);
    } else {
      stats.failedTrades++;
      console.log(`   ❌ Failed: ${result.error}`);
    }
    
    if (i < burstCount - 1) {
      const delay = CONFIG.timing.fomoDelayMinutes * 60 * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('\n   ✅ FOMO burst complete!\n');
}

// Check for FOMO
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
  const tokenMint = process.env.FATBEAR_TOKEN_MINT;
  
  if (!tokenMint) {
    console.error('❌ FATBEAR_TOKEN_MINT not set!');
    return;
  }
  
  console.log(`🎯 Token: ${tokenMint}`);
  console.log(`📊 Trade Range: $${CONFIG.amounts.minUSD}-$${CONFIG.amounts.maxUSD}`);
  console.log(`⏰ Frequency: ~${60/CONFIG.timing.avgDelayMinutes} trades/hour`);
  console.log(`🎯 Daily Target: <$${CONFIG.safety.maxDailyVolumeUSD}`);
  console.log(`💱 Using: Jupiter DEX Aggregator\n`);
  
  // Check balances
  console.log('💰 Checking wallet balances...');
  for (let i = 0; i < wallets.length; i++) {
    const balance = await connection.getBalance(wallets[i].publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    const balanceUSD = balanceSOL * SOL_PRICE_USD;
    const personality = walletPersonalities[i];
    console.log(`   ${personality.name}: ${balanceSOL.toFixed(4)} SOL ($${balanceUSD.toFixed(2)})`);
  }
  console.log('');
  
  // Main loop
  while (true) {
    try {
      // Check for FOMO
      if (shouldTriggerFomo()) {
        await executeFomoBurst(wallets, connection, tokenMint);
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
      
      // Execute real swap
      const result = await executeJupiterSwap(tokenMint, amountSOL, wallet, connection);
      
      if (result.success) {
        stats.tradesExecuted++;
        stats.successfulTrades++;
        stats.totalVolumeSOL += amountSOL;
        stats.totalVolumeUSD += amountUSD;
        stats.dailyVolumeUSD += amountUSD;
        
        const walletKey = wallet.publicKey.toString();
        stats.walletStats[walletKey].trades++;
        stats.walletStats[walletKey].volumeUSD += amountUSD;
        stats.walletStats[walletKey].tokens += result.tokensReceived || 0;
        
        console.log(`   ✅ Success! Received ${result.tokensReceived?.toFixed(0)} $FATBEAR`);
        console.log(`   Daily: $${stats.dailyVolumeUSD.toFixed(0)} | Success rate: ${((stats.successfulTrades/stats.tradesExecuted)*100).toFixed(0)}%`);
        console.log(`   TX: https://solscan.io/tx/${result.signature}`);
      } else {
        stats.failedTrades++;
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
      
      console.log(`⏰ Next: ${nextTime.toLocaleTimeString()} (${Math.round(delayMinutes)} min)`);
      console.log(`📈 Progress: ${stats.successfulTrades} trades | $${stats.totalVolumeUSD.toFixed(0)} volume\n`);
      
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