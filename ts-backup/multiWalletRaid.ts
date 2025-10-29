import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import bs58 from 'bs58';
import fetch from 'cross-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Token configuration
const FATBEAR_TOKEN_MINT = "DHCjYLPy4YhayNGCFnVTequ92thWtEcco1o2fGK9pump"; // $FATBEAR token
const SOLANA_MINT = "So11111111111111111111111111111111111111112";

// Wallet profiles with psychological contexts
interface WalletProfile {
  id: number;
  name: string;
  secretKey: string;
  keypair: Keypair;
  publicKey: PublicKey;
  role: string;
  buyAmounts: number[]; // SOL amounts for each buy
  timingProfile: {
    minDelay: number; // seconds
    maxDelay: number; // seconds
    distribution: 'exponential' | 'poisson' | 'uniform';
  };
  slippageBps: number; // basis points
  priorityLevel: 'low' | 'medium' | 'high' | 'veryHigh';
}

// Initialize connection - use public RPC if Helius fails
const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(rpcUrl);

// Load wallets from environment
function loadWallets(): WalletProfile[] {
  const wallets: WalletProfile[] = [];
  
  // Wallet 1: Master - Shock Phase
  const wallet1Keypair = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_1!));
  wallets.push({
    id: 1,
    name: "Shock Trader",
    secretKey: process.env.RAID_WALLET_1!,
    keypair: wallet1Keypair,
    publicKey: wallet1Keypair.publicKey,
    role: "Big opening buys to create momentum",
    buyAmounts: [1.5, 1.2, 0.8], // 3.5 SOL total
    timingProfile: {
      minDelay: 5,
      maxDelay: 15,
      distribution: 'exponential'
    },
    slippageBps: 300, // 3% - willing to pay for impact
    priorityLevel: 'veryHigh'
  });

  // Wallet 2: Early Build Phase
  const wallet2Keypair = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_2!));
  wallets.push({
    id: 2,
    name: "Early FOMO",
    secretKey: process.env.RAID_WALLET_2!,
    keypair: wallet2Keypair,
    publicKey: wallet2Keypair.publicKey,
    role: "Quick follower creating early momentum",
    buyAmounts: [0.5, 0.4, 0.3, 0.3], // 1.5 SOL total
    timingProfile: {
      minDelay: 20,
      maxDelay: 45,
      distribution: 'poisson'
    },
    slippageBps: 250, // 2.5%
    priorityLevel: 'high'
  });

  // Wallet 3: Mid Push Phase
  const wallet3Keypair = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_3!));
  wallets.push({
    id: 3,
    name: "Momentum Builder",
    secretKey: process.env.RAID_WALLET_3!,
    keypair: wallet3Keypair,
    publicKey: wallet3Keypair.publicKey,
    role: "Sustaining the pump momentum",
    buyAmounts: [0.4, 0.3, 0.3, 0.5], // 1.5 SOL total
    timingProfile: {
      minDelay: 30,
      maxDelay: 60,
      distribution: 'uniform'
    },
    slippageBps: 200, // 2%
    priorityLevel: 'medium'
  });

  // Wallet 4: Late Surge Phase
  const wallet4Keypair = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_4!));
  wallets.push({
    id: 4,
    name: "Late Surge",
    secretKey: process.env.RAID_WALLET_4!,
    keypair: wallet4Keypair,
    publicKey: wallet4Keypair.publicKey,
    role: "Creating final push energy",
    buyAmounts: [0.6, 0.5, 0.4], // 1.5 SOL total
    timingProfile: {
      minDelay: 25,
      maxDelay: 50,
      distribution: 'exponential'
    },
    slippageBps: 300, // 3% - urgency building
    priorityLevel: 'high'
  });

  // Wallet 5: Final Bonding Push
  const wallet5Keypair = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_5!));
  wallets.push({
    id: 5,
    name: "Bond Finisher",
    secretKey: process.env.RAID_WALLET_5!,
    keypair: wallet5Keypair,
    publicKey: wallet5Keypair.publicKey,
    role: "Final push to bonding",
    buyAmounts: [0.8, 0.7, 0.5], // 2 SOL total
    timingProfile: {
      minDelay: 15,
      maxDelay: 30,
      distribution: 'exponential'
    },
    slippageBps: 400, // 4% - maximum urgency
    priorityLevel: 'veryHigh'
  });

  return wallets;
}

// Human-like delay generator
function getHumanDelay(profile: WalletProfile['timingProfile']): number {
  const { minDelay, maxDelay, distribution } = profile;
  let delay: number;

  switch (distribution) {
    case 'exponential':
      // Exponential distribution favors shorter delays
      const lambda = 1 / ((maxDelay - minDelay) / 3);
      delay = minDelay + Math.min(-Math.log(1 - Math.random()) / lambda, maxDelay - minDelay);
      break;
      
    case 'poisson':
      // Poisson-like distribution
      const L = Math.exp(-(maxDelay - minDelay) / 2);
      let k = 0;
      let p = 1;
      do {
        k++;
        p *= Math.random();
      } while (p > L && k < maxDelay - minDelay);
      delay = minDelay + k;
      break;
      
    case 'uniform':
    default:
      // Simple uniform distribution
      delay = minDelay + Math.random() * (maxDelay - minDelay);
  }

  // Add micro-variations (0-3 seconds)
  delay += Math.random() * 3;
  
  return delay * 1000; // Convert to milliseconds
}

// Priority fee calculator based on urgency
function getPriorityFee(level: WalletProfile['priorityLevel']): number {
  const baseFee = 0.00001; // 0.00001 SOL base
  switch (level) {
    case 'low': return baseFee;
    case 'medium': return baseFee * 2;
    case 'high': return baseFee * 5;
    case 'veryHigh': return baseFee * 10;
    default: return baseFee * 2;
  }
}

// Execute swap using Jupiter
async function executeSwap(
  wallet: WalletProfile,
  amountInSol: number
): Promise<boolean> {
  try {
    console.log(`\n🦉 ${wallet.name} (Wallet ${wallet.id}) preparing ${amountInSol} SOL buy...`);
    
    // Convert SOL to lamports
    const amountInLamports = Math.floor(amountInSol * 1e9);
    
    // Get quote from Jupiter
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${SOLANA_MINT}` +
      `&outputMint=${FATBEAR_TOKEN_MINT}` +
      `&amount=${amountInLamports}` +
      `&slippageBps=${wallet.slippageBps}`
    );
    
    const quoteData = await quoteResponse.json();
    if (!quoteData || quoteData.error) {
      console.error(`❌ Quote failed for ${wallet.name}:`, quoteData?.error);
      return false;
    }

    console.log(`📊 Quote received: ${(parseInt(quoteData.outAmount) / 1e9).toFixed(2)} FATBEAR`);

    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: Math.floor(getPriorityFee(wallet.priorityLevel) * 1e9),
        dynamicComputeUnitLimit: true,
      }),
    });

    const swapData = await swapResponse.json();
    if (!swapData || !swapData.swapTransaction) {
      console.error(`❌ Swap transaction failed for ${wallet.name}`);
      return false;
    }

    // Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([wallet.keypair]);

    // Send transaction
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 2,
    });

    console.log(`✅ ${wallet.name} swap sent! Signature: ${signature}`);
    
    // Confirm transaction
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
    });

    console.log(`🎯 ${wallet.name} swap confirmed!`);
    return true;

  } catch (error) {
    console.error(`❌ Error in swap for ${wallet.name}:`, error);
    return false;
  }
}

// Main raid orchestration
async function executeRaid() {
  console.log("🦉 HOOTBOT MULTI-WALLET RAID INITIATED 🦉");
  console.log("Target: $FATBEAR - Push to 100% bonding!");
  console.log("Strategy: 10 SOL across 5 wallets in ~10 minutes\n");

  const wallets = loadWallets();
  
  // Check wallet balances first
  console.log("💰 Checking wallet balances...");
  for (const wallet of wallets) {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`Wallet ${wallet.id} (${wallet.name}): ${(balance / 1e9).toFixed(3)} SOL`);
  }

  console.log("\n🚀 Starting coordinated raid...\n");

  // Track execution state
  const executionQueue: Array<{
    wallet: WalletProfile;
    buyIndex: number;
    executeAt: number;
  }> = [];

  // Build execution timeline
  let currentTime = Date.now();
  
  // Phase 1: Shock (0-2 minutes) - Wallet 1
  for (let i = 0; i < wallets[0].buyAmounts.length; i++) {
    const delay = i === 0 ? 0 : getHumanDelay(wallets[0].timingProfile);
    currentTime += delay;
    executionQueue.push({
      wallet: wallets[0],
      buyIndex: i,
      executeAt: currentTime
    });
  }

  // Phase 2: Early Build (1-3 minutes) - Wallet 2
  currentTime = Date.now() + 60000; // Start 1 minute in
  for (let i = 0; i < wallets[1].buyAmounts.length; i++) {
    const delay = i === 0 ? 0 : getHumanDelay(wallets[1].timingProfile);
    currentTime += delay;
    executionQueue.push({
      wallet: wallets[1],
      buyIndex: i,
      executeAt: currentTime
    });
  }

  // Phase 3: Mid Push (3-6 minutes) - Wallet 3
  currentTime = Date.now() + 180000; // Start 3 minutes in
  for (let i = 0; i < wallets[2].buyAmounts.length; i++) {
    const delay = i === 0 ? 0 : getHumanDelay(wallets[2].timingProfile);
    currentTime += delay;
    executionQueue.push({
      wallet: wallets[2],
      buyIndex: i,
      executeAt: currentTime
    });
  }

  // Phase 4: Late Surge (5-8 minutes) - Wallet 4
  currentTime = Date.now() + 300000; // Start 5 minutes in
  for (let i = 0; i < wallets[3].buyAmounts.length; i++) {
    const delay = i === 0 ? 0 : getHumanDelay(wallets[3].timingProfile);
    currentTime += delay;
    executionQueue.push({
      wallet: wallets[3],
      buyIndex: i,
      executeAt: currentTime
    });
  }

  // Phase 5: Final Push (7-10 minutes) - Wallet 5
  currentTime = Date.now() + 420000; // Start 7 minutes in
  for (let i = 0; i < wallets[4].buyAmounts.length; i++) {
    const delay = i === 0 ? 0 : getHumanDelay(wallets[4].timingProfile);
    currentTime += delay;
    executionQueue.push({
      wallet: wallets[4],
      buyIndex: i,
      executeAt: currentTime
    });
  }

  // Sort by execution time
  executionQueue.sort((a, b) => a.executeAt - b.executeAt);

  // Execute the raid
  const startTime = Date.now();
  let successfulBuys = 0;
  let totalSolSpent = 0;

  for (const action of executionQueue) {
    const waitTime = action.executeAt - Date.now();
    if (waitTime > 0) {
      console.log(`⏳ Waiting ${(waitTime / 1000).toFixed(1)}s for next buy...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    const buyAmount = action.wallet.buyAmounts[action.buyIndex];
    const success = await executeSwap(action.wallet, buyAmount);
    
    if (success) {
      successfulBuys++;
      totalSolSpent += buyAmount;
      console.log(`📈 Progress: ${successfulBuys} buys, ${totalSolSpent.toFixed(1)} SOL spent\n`);
    }
  }

  // Final report
  const totalTime = (Date.now() - startTime) / 1000 / 60; // minutes
  console.log("\n🏁 RAID COMPLETE! 🏁");
  console.log(`Total buys: ${successfulBuys}`);
  console.log(`Total SOL spent: ${totalSolSpent.toFixed(2)}`);
  console.log(`Total time: ${totalTime.toFixed(1)} minutes`);
  console.log("\n🚀 $FATBEAR TO THE MOON! 🚀");
}

// Dry run for testing
async function dryRun() {
  console.log("🧪 DRY RUN - Testing timing and flow...\n");
  
  const wallets = loadWallets();
  let totalPlannedSol = 0;
  
  for (const wallet of wallets) {
    const walletTotal = wallet.buyAmounts.reduce((sum, amount) => sum + amount, 0);
    totalPlannedSol += walletTotal;
    console.log(`${wallet.name}: ${wallet.buyAmounts.length} buys, ${walletTotal} SOL total`);
  }
  
  console.log(`\nTotal planned: ${totalPlannedSol} SOL across ${wallets.length} wallets`);
}

// Run based on command line argument
const args = process.argv.slice(2);
if (args[0] === 'dry') {
  dryRun();
} else if (args[0] === 'raid') {
  executeRaid().catch(console.error);
} else {
  console.log("Usage:");
  console.log("  npm run raid:dry    - Test configuration");
  console.log("  npm run raid:execute - Execute the raid");
}