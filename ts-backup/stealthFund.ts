import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

// Configuration
const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// ENHANCED 15 SOL funding plan - 50% increase for MAXIMUM IMPACT!
const fundingPlan = [
  { wallet: 'RAID_WALLET_1', amount: 5.20, role: 'Shock Trader' },      // was 3.63 → BIG opening impact
  { wallet: 'RAID_WALLET_2', amount: 2.25, role: 'Early FOMO' },        // was 1.58 → Strong follow-up
  { wallet: 'RAID_WALLET_3', amount: 2.30, role: 'Momentum Builder' },  // was 1.61 → Sustain pressure
  { wallet: 'RAID_WALLET_4', amount: 2.25, role: 'Late Surge' },        // was 1.57 → Build urgency
  { wallet: 'RAID_WALLET_5', amount: 3.00, role: 'Bond Finisher' }      // was 2.09 → STRONG finish
];

// Add randomness to amounts (±3%)
function varyAmount(amount: number): number {
  const variation = amount * 0.03 * (Math.random() - 0.5) * 2;
  return amount + variation;
}

// Human-like delay
async function humanDelay(min: number, max: number): Promise<void> {
  const delay = min + Math.random() * (max - min);
  console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)}s...`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// Load master keypair and verify it's the right one
function loadMasterKeypair(): Keypair {
  const expectedAddress = "3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D";
  
  // HootBot Master Wallet private key
  const masterPrivateKey = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];
  
  const keypair = Keypair.fromSecretKey(new Uint8Array(masterPrivateKey));
  
  // Verify it's the correct wallet
  if (keypair.publicKey.toString() === expectedAddress) {
    console.log("✅ Verified: Using correct HootBot master wallet");
    return keypair;
  } else {
    throw new Error(`Keypair mismatch! Expected ${expectedAddress} but got ${keypair.publicKey.toString()}`);
  }
}

// Mixed Funding Strategy (most natural pattern)
async function executeFunding(connection: Connection, masterKeypair: Keypair) {
  console.log("\n🎲 ENHANCED MIXED FUNDING STRATEGY - 15 SOL RAID");
  console.log("Creating MASSIVE buying pressure...\n");

  const wallets: { keypair: Keypair; plan: typeof fundingPlan[0] }[] = [];
  
  // Load all raid wallets
  for (const plan of fundingPlan) {
    const key = process.env[plan.wallet];
    if (!key) throw new Error(`${plan.wallet} not found in environment`);
    wallets.push({
      keypair: Keypair.fromSecretKey(bs58.decode(key)),
      plan
    });
  }

  console.log("📋 Funding Plan:");
  console.log("Master → Wallets 1, 3, 5 (direct heavy hits)");
  console.log("Wallet 1 → Wallet 2 (cascade FOMO)");
  console.log("Wallet 3 → Wallet 4 (cascade urgency)\n");

  // Fund wallets 1, 3, 5 from master
  const directFunds = [0, 2, 4];
  for (const idx of directFunds) {
    console.log(`💸 Master → ${wallets[idx].plan.role}`);
    const amount = idx === 0 
      ? varyAmount(wallets[0].plan.amount + wallets[1].plan.amount + 0.06) // Extra for wallet 2
      : idx === 2
      ? varyAmount(wallets[2].plan.amount + wallets[3].plan.amount + 0.06) // Extra for wallet 4
      : varyAmount(wallets[4].plan.amount);
      
    await transferSOL(connection, masterKeypair, wallets[idx].keypair.publicKey, amount);
    
    if (idx < 4) { // Don't wait after last transfer
      await humanDelay(25000, 60000);
    }
  }

  await humanDelay(30000, 45000);

  // Fund wallet 2 from wallet 1
  console.log(`\n💸 ${wallets[0].plan.role} → ${wallets[1].plan.role}`);
  await transferSOL(
    connection, 
    wallets[0].keypair, 
    wallets[1].keypair.publicKey, 
    varyAmount(wallets[1].plan.amount)
  );
  
  await humanDelay(30000, 45000);

  // Fund wallet 4 from wallet 3
  console.log(`\n💸 ${wallets[2].plan.role} → ${wallets[3].plan.role}`);
  await transferSOL(
    connection, 
    wallets[2].keypair, 
    wallets[3].keypair.publicKey, 
    varyAmount(wallets[3].plan.amount)
  );

  console.log("\n✅ All wallets funded successfully!");
}

// Core transfer function with error handling
async function transferSOL(
  connection: Connection,
  from: Keypair,
  to: PublicKey,
  amount: number
): Promise<void> {
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: from.publicKey,
        toPubkey: to,
        lamports: Math.floor(amount * 1e9),
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [from],
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );

    console.log(`   ✓ Sent ${amount.toFixed(3)} SOL`);
    console.log(`   ✓ Tx: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
  } catch (error) {
    console.error(`   ❌ Transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Main execution
async function main() {
  console.log("🦉 HOOTBOT RAID WALLET FUNDING SYSTEM");
  console.log("=====================================");
  console.log("💪 15 SOL MEGA RAID EDITION\n");

  let masterKeypair: Keypair;
  
  try {
    masterKeypair = loadMasterKeypair();
  } catch (error) {
    console.error("❌ Failed to load master wallet:", error instanceof Error ? error.message : String(error));
    console.log("\nMake sure you have either:");
    console.log("1. HOOTBOT_KEYPAIR_PATH=/Users/owner/Desktop/HootBot/wallet.json");
    console.log("2. WALLET_SECRET_KEY=<base58_key>");
    process.exit(1);
  }
  
  const connection = new Connection(rpcUrl);
  
  console.log(`Master wallet: ${masterKeypair.publicKey.toString()}`);
  
  // Check master wallet balance
  const balance = await connection.getBalance(masterKeypair.publicKey);
  const totalNeeded = fundingPlan.reduce((sum, p) => sum + p.amount, 0);
  const withFees = totalNeeded + 0.08; // Increased fee buffer for larger amounts
  
  console.log(`Balance: ${(balance / 1e9).toFixed(4)} SOL`);
  console.log(`Needed: ${totalNeeded.toFixed(2)} SOL (15 SOL raid funds)`);
  console.log(`Fees: ~0.08 SOL (transaction costs)`);
  console.log(`Total required: ${withFees.toFixed(2)} SOL\n`);
  
  if (balance / 1e9 < withFees) {
    const shortBy = withFees - (balance / 1e9);
    console.error("❌ Insufficient balance!");
    console.log(`Short by: ${shortBy.toFixed(4)} SOL`);
    
    if (shortBy < 0.2) {
      console.log("\n💡 You're very close! Add just a bit more SOL to proceed.");
    } else {
      console.log("\n💡 You need to add more SOL to the master wallet.");
    }
    process.exit(1);
  }

  console.log("✅ Sufficient balance confirmed!");
  console.log("\n📊 ENHANCED RAID DISTRIBUTION:");
  fundingPlan.forEach(p => {
    console.log(`   ${p.role}: ${p.amount} SOL`);
  });
  console.log(`   💰 TOTAL: ${totalNeeded.toFixed(2)} SOL`);
  console.log("\n⚠️  This will fund 5 raid wallets with ~15 SOL total");
  console.log("🚀 MAXIMUM FIREPOWER to push $FATBEAR to 100% bonding!");
  console.log("Press Ctrl+C in next 5 seconds to cancel...\n");
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Execute funding
  await executeFunding(connection, masterKeypair);
  
  console.log("\n🎉 Funding complete!");
  console.log("💰 15 SOL distributed across 5 wallets!");
  console.log("\nRun 'npm run raid:check' to verify all wallets are ready");
  console.log("\nThen: 'npm run raid:execute' to start the $FATBEAR MEGA RAID! 🚀");
}

// Run the funding
main().catch(error => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});