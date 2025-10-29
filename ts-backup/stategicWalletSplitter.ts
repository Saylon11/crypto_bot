// HootBot/src/devTools/strategicWalletSplitter.ts

import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction,
  sendAndConfirmTransaction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount
} from '@solana/spl-token';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

// Configuration
const FATBEAR_MINT = new PublicKey('Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump');
const TOTAL_TOKENS = 81_650_000; // 81.65M tokens

// Distribution strategy
const DISTRIBUTION_STRATEGY = {
  // Create natural-looking holder distribution
  largeHolders: [
    { percentage: 8, label: "Holder 1" },   // 6.5M
    { percentage: 7, label: "Holder 2" },   // 5.7M
    { percentage: 6, label: "Holder 3" },   // 4.9M
    { percentage: 5, label: "Holder 4" },   // 4.1M
    { percentage: 5, label: "Holder 5" },   // 4.1M
  ],
  mediumHolders: [
    { percentage: 4, label: "Medium 1" },   // 3.3M
    { percentage: 3.5, label: "Medium 2" }, // 2.9M
    { percentage: 3, label: "Medium 3" },   // 2.4M
    { percentage: 3, label: "Medium 4" },   // 2.4M
    { percentage: 2.5, label: "Medium 5" }, // 2.0M
  ],
  smallHolders: Array(20).fill(null).map((_, i) => ({
    percentage: 2.5, // 50% total for small holders
    label: `Small ${i + 1}`
  }))
};

// Timing configuration for natural appearance
const TIMING_CONFIG = {
  minDelayMs: 15000,  // 15 seconds
  maxDelayMs: 300000, // 5 minutes
  useRandomTiming: true,
  // Peak activity hours (UTC)
  peakHours: [14, 15, 16, 17, 18, 19, 20, 21], // US trading hours
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomDelay(): number {
  if (!TIMING_CONFIG.useRandomTiming) {
    return TIMING_CONFIG.minDelayMs;
  }
  
  // Use exponential distribution for more natural timing
  const range = TIMING_CONFIG.maxDelayMs - TIMING_CONFIG.minDelayMs;
  const random = Math.random();
  const exponential = -Math.log(1 - random);
  const scaled = exponential / 3; // Adjust rate parameter
  const delay = TIMING_CONFIG.minDelayMs + (range * Math.min(scaled, 1));
  
  return Math.floor(delay);
}

async function createWalletIfNeeded(): Promise<Keypair> {
  const wallet = Keypair.generate();
  console.log(`🔑 Generated wallet: ${wallet.publicKey.toBase58()}`);
  return wallet;
}

async function fundWalletForFees(
  connection: Connection,
  sourceWallet: Keypair,
  targetWallet: PublicKey,
  amount: number = 0.01
): Promise<string> {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: sourceWallet.publicKey,
      toPubkey: targetWallet,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [sourceWallet]
  );
  
  return signature;
}

async function transferTokens(
  connection: Connection,
  sourceWallet: Keypair,
  targetWallet: PublicKey,
  amount: number,
  mint: PublicKey
): Promise<string> {
  const sourceATA = await getAssociatedTokenAddress(mint, sourceWallet.publicKey);
  const targetATA = await getAssociatedTokenAddress(mint, targetWallet);
  
  const transaction = new Transaction();
  
  // Check if target ATA exists
  try {
    await getAccount(connection, targetATA);
  } catch {
    // Create ATA if it doesn't exist
    transaction.add(
      createAssociatedTokenAccountInstruction(
        sourceWallet.publicKey,
        targetATA,
        targetWallet,
        mint
      )
    );
  }
  
  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      sourceATA,
      targetATA,
      sourceWallet.publicKey,
      amount * 1_000_000, // Assuming 6 decimals
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [sourceWallet]
  );
  
  return signature;
}

async function executeSplit(
  sourceWalletPath: string,
  dryRun: boolean = false
): Promise<void> {
  console.log('🚀 Starting FATBEAR Strategic Wallet Split');
  console.log(`📊 Total tokens to distribute: ${TOTAL_TOKENS.toLocaleString()}`);
  console.log(`🔄 Dry run: ${dryRun}`);
  console.log('=' . repeat(60));
  
  // Load source wallet
  let sourceWallet: Keypair;
  try {
    // Try loading as a file path first
    if (fs.existsSync(sourceWalletPath)) {
      const walletData = JSON.parse(fs.readFileSync(sourceWalletPath, 'utf-8'));
      sourceWallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    } else {
      // Try as base58 private key
      const bs58 = require('bs58');
      sourceWallet = Keypair.fromSecretKey(bs58.decode(sourceWalletPath));
    }
    console.log(`✅ Source wallet loaded: ${sourceWallet.publicKey.toBase58()}`);
  } catch (error) {
    console.error('❌ Failed to load source wallet:', error);
    return;
  }
  
  // Setup connection
  const connection = new Connection(
    process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );
  
  // Check SOL balance for fees
  const balance = await connection.getBalance(sourceWallet.publicKey);
  console.log(`💰 SOL balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.error('❌ Insufficient SOL for fees. Need at least 0.1 SOL');
    return;
  }
  
  // Create distribution plan
  const allHolders = [
    ...DISTRIBUTION_STRATEGY.largeHolders,
    ...DISTRIBUTION_STRATEGY.mediumHolders,
    ...DISTRIBUTION_STRATEGY.smallHolders
  ];
  
  const distributions = allHolders.map(holder => ({
    wallet: Keypair.generate(),
    amount: Math.floor(TOTAL_TOKENS * (holder.percentage / 100)),
    label: holder.label
  }));
  
  // Save wallet mapping
  const walletMapping = distributions.map(d => ({
    address: d.wallet.publicKey.toBase58(),
    privateKey: Array.from(d.wallet.secretKey),
    amount: d.amount,
    label: d.label
  }));
  
  if (!dryRun) {
    fs.writeFileSync(
      './fatbear-distribution-wallets.json',
      JSON.stringify(walletMapping, null, 2)
    );
    console.log('💾 Wallet mapping saved to fatbear-distribution-wallets.json');
  }
  
  console.log('\n📋 Distribution Plan:');
  distributions.forEach(d => {
    console.log(`   ${d.label}: ${d.amount.toLocaleString()} tokens (${d.wallet.publicKey.toBase58().slice(0, 8)}...)`);
  });
  
  if (dryRun) {
    console.log('\n✅ Dry run complete. No transactions were sent.');
    return;
  }
  
  // Execute transfers
  console.log('\n🔄 Starting transfers...');
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < distributions.length; i++) {
    const dist = distributions[i];
    
    try {
      console.log(`\n📤 Transfer ${i + 1}/${distributions.length}: ${dist.label}`);
      
      // Fund wallet for fees (0.01 SOL)
      console.log('   💸 Funding wallet for fees...');
      await fundWalletForFees(connection, sourceWallet, dist.wallet.publicKey);
      
      // Random delay
      const delay = getRandomDelay();
      console.log(`   ⏱️  Waiting ${(delay / 1000).toFixed(1)}s...`);
      await sleep(delay);
      
      // Transfer tokens
      console.log(`   📦 Transferring ${dist.amount.toLocaleString()} tokens...`);
      const signature = await transferTokens(
        connection,
        sourceWallet,
        dist.wallet.publicKey,
        dist.amount,
        FATBEAR_MINT
      );
      
      console.log(`   ✅ Success! TX: ${signature}`);
      successCount++;
      
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      failCount++;
      
      // Continue with next transfer
      continue;
    }
  }
  
  console.log('\n' + '=' . repeat(60));
  console.log('📊 Split Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📦 Total distributed: ${distributions.reduce((sum, d) => sum + d.amount, 0).toLocaleString()} tokens`);
  console.log('\n✨ Split complete! Check fatbear-distribution-wallets.json for wallet details.');
}

// CLI Interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Use the hardcoded whale wallet if no arguments provided
  const WHALE_WALLET_KEY = 'y31AJw6fGDVdwLwC9gGaQWR2f1f1G7JihvdR7gqgHjQ6cz7uNCkq2VRMdrkfVoZKFG5be3y4yZ1AXkAnQhwSLRh';
  
  if (args.length < 1) {
    console.log('🐋 Using hardcoded whale wallet for split operation');
    const dryRun = args.includes('--dry-run');
    executeSplit(WHALE_WALLET_KEY, dryRun).catch(console.error);
  } else {
    const walletPath = args[0];
    const dryRun = args.includes('--dry-run');
    executeSplit(walletPath, dryRun).catch(console.error);
  }
}

export { executeSplit };