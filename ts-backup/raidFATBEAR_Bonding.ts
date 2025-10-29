// HootBot/src/pumpTools/raidFATBEAR_Bonding.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';

dotenv.config();

// Import with require for better compatibility
const { executeBuy } = require('./tradeExecutor');

// Simple logger fallback
const logRaid = async (data: any) => {
  console.log('[RAID LOG]', JSON.stringify(data, null, 2));
};

// FATBEAR Token Configuration
const FATBEAR_MINT = process.env.TARGET_TOKEN_MINT;
const TOTAL_RAID_AMOUNT = 10; // 10 SOL total
const BONDING_TARGET = 69000; // $69K market cap target

// ============================================
// ANTI-JEET BONDING STRATEGY
// Sophisticated approach to overcome sell pressure
// ============================================

interface RaidPhase {
  name: string;
  description: string;
  totalSOL: number;
  pattern: 'shock' | 'sustain' | 'sweep' | 'surge';
}

const BONDING_RAID_PHASES: RaidPhase[] = [
  {
    name: 'SHOCK PHASE',
    description: 'Initial shock buy to trigger alerts and FOMO',
    totalSOL: 2.5,
    pattern: 'shock'
  },
  {
    name: 'SUSTAIN PHASE',
    description: 'Sustained pressure to absorb jeet sells',
    totalSOL: 3.0,
    pattern: 'sustain'
  },
  {
    name: 'SWEEP PHASE',
    description: 'Sweep remaining sells with increasing buys',
    totalSOL: 2.5,
    pattern: 'sweep'
  },
  {
    name: 'SURGE PHASE',
    description: 'Final surge to break bonding threshold',
    totalSOL: 2.0,
    pattern: 'surge'
  }
];

// Get wallet function
function getWallet(): Keypair {
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (keypairPath) {
    try {
      console.log(`Loading HootBot wallet...`);
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
      return wallet;
    } catch (error) {
      console.error('Error loading keypair file:', error);
    }
  }
  
  const secretKey = process.env.WALLET_SECRET_KEY;
  if (!secretKey) {
    throw new Error('No wallet configured!');
  }
  
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

// Get connection with fallback handling
function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  
  // Skip Helius if key is invalid or default
  if (heliusKey && heliusKey !== 'your_key' && heliusKey !== '' && !heliusKey.includes('your_')) {
    console.log('Attempting Helius RPC (will fallback if unauthorized)...');
    return new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
      'confirmed'
    );
  } else {
    console.log('Using public RPC...');
    return new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }
}

// Execute phase-specific buy patterns
async function executePhase(
  phase: RaidPhase,
  wallet: Keypair,
  connection: Connection
): Promise<{ success: number; failed: number; volume: number }> {
  console.log(`\n🔥 ${phase.name}`);
  console.log(`📋 ${phase.description}`);
  console.log(`💰 Allocated: ${phase.totalSOL} SOL`);
  
  let successCount = 0;
  let failedCount = 0;
  let totalVolume = 0;
  
  switch (phase.pattern) {
    case 'shock':
      // Single large buy to create momentum
      console.log('\n⚡ SHOCK BUY INCOMING...');
      try {
        const result = await executeBuy(
          FATBEAR_MINT,
          phase.totalSOL,
          wallet,
          connection,
          true // Skip MIND
        );
        
        if (result.success) {
          successCount++;
          totalVolume += phase.totalSOL;
          console.log(`✅ SHOCK DELIVERED! ${phase.totalSOL} SOL`);
          console.log(`💥 Market impact achieved!`);
        } else {
          failedCount++;
          console.log(`❌ Shock failed: ${result.error}`);
        }
      } catch (error) {
        failedCount++;
        console.error('Shock error:', error);
      }
      break;
      
    case 'sustain':
      // Multiple medium buys to maintain pressure
      const sustainBuys = 8;
      const sustainAmount = phase.totalSOL / sustainBuys;
      
      console.log(`\n🔄 Sustaining with ${sustainBuys} buys of ${sustainAmount.toFixed(3)} SOL`);
      
      for (let i = 0; i < sustainBuys; i++) {
        try {
          // Vary amount slightly
          const buyAmount = sustainAmount * (0.8 + Math.random() * 0.4);
          
          console.log(`\n📍 Sustain buy ${i + 1}/${sustainBuys}: ${buyAmount.toFixed(3)} SOL`);
          
          const result = await executeBuy(
            FATBEAR_MINT,
            buyAmount,
            wallet,
            connection,
            true
          );
          
          if (result.success) {
            successCount++;
            totalVolume += buyAmount;
            console.log(`   ✅ Pressure maintained!`);
          } else {
            failedCount++;
            console.log(`   ❌ Failed: ${result.error}`);
          }
          
          // Short delay between sustain buys
          if (i < sustainBuys - 1) {
            const delay = 2000 + Math.random() * 2000; // 2-4 seconds
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          failedCount++;
          console.error(`Sustain buy ${i + 1} error:`, error);
        }
      }
      break;
      
    case 'sweep':
      // Increasing buys to sweep sell walls
      const sweepBuys = 6;
      const baseAmount = phase.totalSOL / (sweepBuys * 1.5); // Account for increase
      
      console.log(`\n🧹 SWEEPING SELLS...`);
      
      for (let i = 0; i < sweepBuys; i++) {
        try {
          // Progressively larger buys
          const multiplier = 1 + (i * 0.3); // 1x, 1.3x, 1.6x, etc.
          const buyAmount = baseAmount * multiplier;
          
          console.log(`\n🌊 Sweep ${i + 1}/${sweepBuys}: ${buyAmount.toFixed(3)} SOL (${multiplier.toFixed(1)}x)`);
          
          const result = await executeBuy(
            FATBEAR_MINT,
            buyAmount,
            wallet,
            connection,
            true
          );
          
          if (result.success) {
            successCount++;
            totalVolume += buyAmount;
            console.log(`   ✅ Sells swept!`);
          } else {
            failedCount++;
            console.log(`   ❌ Sweep failed: ${result.error}`);
          }
          
          // Accelerating delays
          if (i < sweepBuys - 1) {
            const delay = Math.max(500, 3000 - (i * 400)); // Faster as we go
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          failedCount++;
          console.error(`Sweep ${i + 1} error:`, error);
        }
      }
      break;
      
    case 'surge':
      // Final push with rapid buys
      const surgeBuys = 5;
      const surgeAmount = phase.totalSOL / surgeBuys;
      
      console.log(`\n🚀 FINAL SURGE TO BONDING!`);
      console.log(`⚡ Rapid-fire ${surgeBuys} buys incoming...`);
      
      for (let i = 0; i < surgeBuys; i++) {
        try {
          console.log(`\n💥 SURGE ${i + 1}/${surgeBuys}: ${surgeAmount.toFixed(3)} SOL`);
          
          const result = await executeBuy(
            FATBEAR_MINT,
            surgeAmount,
            wallet,
            connection,
            true
          );
          
          if (result.success) {
            successCount++;
            totalVolume += surgeAmount;
            console.log(`   ✅ PUSHING TO BONDING!`);
          } else {
            failedCount++;
            console.log(`   ❌ Surge failed: ${result.error}`);
          }
          
          // Minimal delay for maximum impact
          if (i < surgeBuys - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          failedCount++;
          console.error(`Surge ${i + 1} error:`, error);
        }
      }
      break;
  }
  
  return { success: successCount, failed: failedCount, volume: totalVolume };
}

// Main bonding raid execution
export async function executeBondingRaid(): Promise<void> {
  console.log('\n🦉 FATBEAR BONDING RAID SYSTEM ACTIVATED');
  console.log('=========================================');
  console.log(`🎯 Target: Push $FATBEAR to bonding curve`);
  console.log(`💰 Total firepower: ${TOTAL_RAID_AMOUNT} SOL`);
  console.log(`📈 Current: ~80% bonded → Target: 100% BONDED!`);
  
  let connection = getConnection();
  const wallet = getWallet();
  
  // Pre-flight check with Helius fallback
  let balance: number;
  try {
    balance = await connection.getBalance(wallet.publicKey);
  } catch (error: any) {
    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      console.log('⚠️  Helius unauthorized, switching to public RPC...');
      connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      balance = await connection.getBalance(wallet.publicKey);
    } else {
      throw error;
    }
  }
  
  console.log(`\n💳 HootBot balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (balance < TOTAL_RAID_AMOUNT * LAMPORTS_PER_SOL) {
    throw new Error(`Insufficient balance! Need ${TOTAL_RAID_AMOUNT} SOL`);
  }
  
  console.log('\n⚡ INITIATING 4-PHASE ANTI-JEET PROTOCOL...');
  console.log('Phase 1: SHOCK - Break jeet psychology');
  console.log('Phase 2: SUSTAIN - Absorb panic sells');
  console.log('Phase 3: SWEEP - Clear remaining sells');
  console.log('Phase 4: SURGE - Push to bonding!');
  
  // Countdown
  console.log('\n🚀 RAID STARTS IN...');
  for (let i = 3; i > 0; i--) {
    console.log(`   ${i}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  console.log('   🔥 LET\'S BOND THIS BEAR! 🔥\n');
  
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalVolume = 0;
  
  // Execute each phase
  for (const phase of BONDING_RAID_PHASES) {
    const results = await executePhase(phase, wallet, connection);
    totalSuccess += results.success;
    totalFailed += results.failed;
    totalVolume += results.volume;
    
    console.log(`\n📊 ${phase.name} Complete:`);
    console.log(`   ✅ Successful: ${results.success}`);
    console.log(`   ❌ Failed: ${results.failed}`);
    console.log(`   💰 Volume: ${results.volume.toFixed(2)} SOL`);
    
    // Brief pause between phases
    if (phase !== BONDING_RAID_PHASES[BONDING_RAID_PHASES.length - 1]) {
      console.log('\n⏳ Preparing next phase...');
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  // Final report
  console.log('\n========================================');
  console.log('🏁 BONDING RAID COMPLETE!');
  console.log('========================================');
  console.log(`✅ Total successful buys: ${totalSuccess}`);
  console.log(`❌ Total failed buys: ${totalFailed}`);
  console.log(`💰 Total volume generated: ${totalVolume.toFixed(2)} SOL`);
  console.log(`📈 Success rate: ${((totalSuccess / (totalSuccess + totalFailed)) * 100).toFixed(1)}%`);
  
  if (totalVolume >= 8) {
    console.log('\n🎉 MISSION SUCCESS! Check if FATBEAR bonded!');
    console.log('🌙 TO THE MOON! 🚀🐻');
  } else {
    console.log('\n⚠️  Volume lower than expected. May need follow-up raid.');
  }
}

// Quick raid function for emergency anti-jeet action
export async function emergencyAntiJeetBuy(amountSOL: number): Promise<void> {
  console.log(`\n🚨 EMERGENCY ANTI-JEET BUY: ${amountSOL} SOL`);
  
  const connection = getConnection();
  const wallet = getWallet();
  
  try {
    const result = await executeBuy(
      FATBEAR_MINT,
      amountSOL,
      wallet,
      connection,
      true
    );
    
    if (result.success) {
      console.log(`✅ Jeet neutralized! TX: ${result.signature}`);
    } else {
      console.log(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Emergency buy error:', error);
  }
}

// Monitor and counter jeet activity (optional real-time defense)
export async function activateJeetDefense(): Promise<void> {
  console.log('\n🛡️ JEET DEFENSE SYSTEM ACTIVATED');
  console.log('Monitoring for large sells...');
  
  // This would connect to a websocket or poll for sells
  // and automatically counter with buys
  // Implementation depends on your monitoring setup
}

// Direct execution
if (require.main === module) {
  const mode = process.argv[2];
  
  if (mode === 'emergency') {
    const amount = parseFloat(process.argv[3] || '1');
    emergencyAntiJeetBuy(amount)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Emergency buy error:', error);
        process.exit(1);
      });
  } else {
    executeBondingRaid()
      .then(() => {
        console.log('\n🦉 HootBot signing off. Check bonding status!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('Bonding raid error:', error);
        process.exit(1);
      });
  }
}