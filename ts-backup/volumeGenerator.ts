// HootBot/src/bots/volume/volumeGenerator.ts
// Multi-wallet volume generator for $FATBEAR
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js';
import * as dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';

dotenv.config();

// Configuration
const CONFIG = {
  amounts: {
    min: 0.001,
    max: 0.01,
    variance: 0.15,
    whaleProbability: 0.05,
    whaleMultiplier: 2,
  },
  timing: {
    minDelayMinutes: 3,
    maxDelayMinutes: 15,
    avgDelayMinutes: 8,
    consecutiveBuyChance: 0.15,
    fomoDelaySeconds: { min: 30, max: 90 },
  },
  patterns: {
    peakHours: [14, 15, 16, 20, 21, 22],
    peakMultiplier: 1.5,
    weekendMultiplier: 0.7,
  },
  targets: {
    dailyVolume: 1.0,
    minWalletBalance: 0.1,
  },
};

// Stats tracking
let stats = {
  tradesExecuted: 0,
  totalVolume: 0,
  dailyVolume: 0,
  walletStats: {} as Record<string, { trades: number; volume: number }>,
};

// Wallet personalities with proper typing
interface WalletPersonality {
  min: number;
  max: number;
  variance: number;
}

const walletPersonalities: WalletPersonality[] = [
  { min: 0.002, max: 0.015, variance: 0.2 },    // Master: slightly larger
  { min: 0.001, max: 0.008, variance: 0.15 },   // Raid 1: conservative
  { min: 0.001, max: 0.012, variance: 0.25 },   // Raid 2: more variable
  { min: 0.001, max: 0.01, variance: 0.1 },     // Raid 3: consistent
  { min: 0.002, max: 0.009, variance: 0.18 },   // Raid 4: mid-range
  { min: 0.001, max: 0.011, variance: 0.22 },   // Raid 5: aggressive
];

// Load all wallets
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
        console.log(`   ✅ Raid ${i}: ${wallet.publicKey.toString().slice(0, 8)}...`);
        stats.walletStats[wallet.publicKey.toString()] = { trades: 0, volume: 0 };
      } catch (error) {
        console.error(`   ❌ Error loading raid wallet ${i}:`, error);
      }
    }
  }
  
  console.log(`\n📊 Loaded ${wallets.length} wallets total\n`);
  return wallets;
}

// Get connection
function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  if (heliusKey && heliusKey !== 'your_key') {
    console.log('🌐 Using Helius RPC');
    return new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, 'confirmed');
  }
  console.log('🌐 Using public RPC');
  return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}

// Select wallet intelligently
function selectWallet(wallets: Keypair[]): { wallet: Keypair; index: number } {
  // 30% chance for master wallet
  if (Math.random() < 0.3 && wallets.length > 0) {
    return { wallet: wallets[0], index: 0 };
  }
  
  // Select from raid wallets
  const raidWallets = wallets.slice(1);
  if (raidWallets.length === 0) {
    return { wallet: wallets[0], index: 0 };
  }
  
  // Random selection from raid wallets
  const randomIndex = Math.floor(Math.random() * raidWallets.length);
  return { wallet: raidWallets[randomIndex], index: randomIndex + 1 };
}

// Generate trade amount
function generateTradeAmount(walletIndex: number): number {
  const personality = walletPersonalities[walletIndex] || walletPersonalities[0];
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  
  // Base amount
  let amount = personality.min + (Math.random() * (personality.max - personality.min));
  
  // Apply variance
  amount *= (1 + (Math.random() * 2 - 1) * personality.variance);
  
  // Peak hour boost
  if (CONFIG.patterns.peakHours.includes(hour)) {
    amount *= CONFIG.patterns.peakMultiplier;
  }
  
  // Weekend reduction
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    amount *= CONFIG.patterns.weekendMultiplier;
  }
  
  // Whale chance
  if (Math.random() < CONFIG.amounts.whaleProbability) {
    amount *= CONFIG.amounts.whaleMultiplier;
    console.log('🐋 Whale buy triggered!');
  }
  
  return Math.max(0.001, Math.min(amount, 0.02));
}

// Generate delay
function generateDelay(): number {
  const { minDelayMinutes, maxDelayMinutes, avgDelayMinutes } = CONFIG.timing;
  const lambda = 1 / avgDelayMinutes;
  let delay = -Math.log(1 - Math.random()) / lambda;
  delay = Math.max(minDelayMinutes, Math.min(delay, maxDelayMinutes));
  return delay * 60 * 1000;
}

// Simple buy simulation (replace with real swap logic)
async function executeTrade(
  wallet: Keypair,
  amount: number,
  connection: Connection
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // For testing: just do a tiny self-transfer
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 1000, // 0.000001 SOL
      })
    );
    
    const signature = await connection.sendTransaction(transaction, [wallet]);
    await connection.confirmTransaction(signature, 'confirmed');
    
    return { success: true, signature };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Main loop
async function run() {
  console.log('🦉 HootBot Multi-Wallet Volume Generator');
  console.log('========================================\n');
  
  const wallets = loadWallets();
  if (wallets.length < 2) {
    console.error('❌ Need at least 2 wallets!');
    return;
  }
  
  const connection = getConnection();
  const tokenMint = process.env.FATBEAR_TOKEN_MINT;
  
  if (!tokenMint) {
    console.error('❌ FATBEAR_TOKEN_MINT not set in .env!');
    return;
  }
  
  console.log(`🎯 Token: ${tokenMint}`);
  console.log(`📊 Target: ${CONFIG.targets.dailyVolume} SOL daily`);
  console.log(`💰 Trade size: ${CONFIG.amounts.min}-${CONFIG.amounts.max} SOL`);
  console.log(`⏰ Avg delay: ${CONFIG.timing.avgDelayMinutes} minutes\n`);
  
  // Check balances
  console.log('💰 Wallet balances:');
  for (let i = 0; i < wallets.length; i++) {
    const balance = await connection.getBalance(wallets[i].publicKey);
    const name = i === 0 ? 'Master' : `Raid ${i}`;
    console.log(`   ${name}: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  }
  console.log('');
  
  // Main trading loop
  while (true) {
    try {
      // Select wallet
      const { wallet, index } = selectWallet(wallets);
      const walletName = index === 0 ? 'Master' : `Raid ${index}`;
      
      // Check balance
      const balance = await connection.getBalance(wallet.publicKey);
      const balanceInSol = balance / LAMPORTS_PER_SOL;
      
      if (balanceInSol < CONFIG.targets.minWalletBalance) {
        console.log(`⚠️  Low balance in ${walletName}: ${balanceInSol.toFixed(4)} SOL`);
        await new Promise(resolve => setTimeout(resolve, 60000));
        continue;
      }
      
      // Generate amount
      const amount = generateTradeAmount(index);
      
      console.log(`\n💫 Trade #${stats.tradesExecuted + 1}`);
      console.log(`   Wallet: ${walletName} (${wallet.publicKey.toString().slice(0, 8)}...)`);
      console.log(`   Amount: ${amount.toFixed(4)} SOL`);
      console.log(`   Balance: ${balanceInSol.toFixed(4)} SOL`);
      
      // Execute trade
      const result = await executeTrade(wallet, amount, connection);
      
      if (result.success) {
        // Update stats
        stats.tradesExecuted++;
        stats.totalVolume += amount;
        stats.dailyVolume += amount;
        
        const walletKey = wallet.publicKey.toString();
        if (!stats.walletStats[walletKey]) {
          stats.walletStats[walletKey] = { trades: 0, volume: 0 };
        }
        stats.walletStats[walletKey].trades++;
        stats.walletStats[walletKey].volume += amount;
        
        console.log(`   ✅ Success!`);
        console.log(`   Daily volume: ${stats.dailyVolume.toFixed(4)} SOL`);
        if (result.signature) {
          console.log(`   TX: https://solscan.io/tx/${result.signature}`);
        }
      } else {
        console.log(`   ❌ Failed: ${result.error}`);
      }
      
      // Calculate delay
      let delay = generateDelay();
      
      // FOMO chance
      if (result.success && Math.random() < CONFIG.timing.consecutiveBuyChance) {
        const { min, max } = CONFIG.timing.fomoDelaySeconds;
        delay = (min + Math.random() * (max - min)) * 1000;
        console.log('⚡ FOMO: Quick follow-up coming...');
      }
      
      const nextTime = new Date(Date.now() + delay);
      console.log(`⏰ Next: ${nextTime.toLocaleTimeString()} (${Math.round(delay / 60000)} min)\n`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      console.error('❌ Error:', error);
      await new Promise(resolve => setTimeout(resolve, 300000)); // 5 min
    }
  }
}

// Export for module usage
export function getVolumeStats() {
  return stats;
}

export { run as runVolumeGenerator };

// Start if run directly
if (require.main === module) {
  run().catch(console.error);
}
