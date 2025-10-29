import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Master wallet private key
const masterPrivateKey = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];

// Direct funding amounts for 15 SOL raid
const fundingTargets = [
  { 
    address: "5aCcVYe1UqNyW7T6MJgGxHbNC68DTG8bETSHKGraZLab",
    name: "Shock Trader (W1)",
    targetAmount: 5.2
  },
  { 
    address: "DRnNH2TGGvdFpB4nkQ4qSnGWKwzDDqjR63H3JkjjnaqM",
    name: "Early FOMO (W2)",
    targetAmount: 2.25
  },
  { 
    address: "B4To1EPQUTknxAtLsWXb8XNE6eCxF4JSbqAbvCPdGJpz",
    name: "Momentum Builder (W3)",
    targetAmount: 2.3
  },
  { 
    address: "65UBnoSyUKwaPMNB56mZiPigrM4prFJdUGutEXMnBFfu",
    name: "Late Surge (W4)",
    targetAmount: 2.25
  },
  { 
    address: "D4d1i8VYf8eN3gUkYpSu4dLUDvBKAKnRz4n4tXbWxEDF",
    name: "Bond Finisher (W5)",
    targetAmount: 3.0
  }
];

async function directMasterFunding() {
  console.log("🦉 DIRECT MASTER WALLET FUNDING");
  console.log("================================\n");

  const connection = new Connection(rpcUrl);
  const masterKeypair = Keypair.fromSecretKey(new Uint8Array(masterPrivateKey));
  
  console.log(`Master wallet: ${masterKeypair.publicKey.toString()}`);
  
  // Check master balance
  const masterBalance = await connection.getBalance(masterKeypair.publicKey);
  console.log(`Master balance: ${(masterBalance / 1e9).toFixed(4)} SOL\n`);
  
  if (masterBalance / 1e9 < 15.1) {
    console.error("❌ Insufficient balance in master wallet!");
    return;
  }

  console.log("📊 Checking current wallet balances and funding needs:\n");
  
  let totalNeeded = 0;
  const fundingPlan: Array<{wallet: typeof fundingTargets[0], currentBalance: number, needed: number}> = [];
  
  // Check each wallet's current balance
  for (const wallet of fundingTargets) {
    const pubkey = new PublicKey(wallet.address);
    const balance = await connection.getBalance(pubkey);
    const balanceInSol = balance / 1e9;
    const needed = Math.max(0, wallet.targetAmount - balanceInSol + 0.01); // Add 0.01 for fees
    
    fundingPlan.push({ wallet, currentBalance: balanceInSol, needed });
    totalNeeded += needed;
    
    console.log(`${wallet.name}:`);
    console.log(`  Current: ${balanceInSol.toFixed(3)} SOL`);
    console.log(`  Target: ${wallet.targetAmount} SOL`);
    console.log(`  Needs: ${needed.toFixed(3)} SOL\n`);
  }
  
  console.log(`Total SOL needed: ${totalNeeded.toFixed(3)} SOL\n`);
  
  if (masterBalance / 1e9 < totalNeeded) {
    console.error(`❌ Master wallet needs ${totalNeeded.toFixed(3)} SOL but only has ${(masterBalance / 1e9).toFixed(3)} SOL`);
    return;
  }
  
  console.log("✅ Sufficient balance! Starting funding...\n");
  
  // Fund each wallet
  for (const { wallet, needed } of fundingPlan) {
    if (needed <= 0.01) {
      console.log(`✓ ${wallet.name} already has sufficient balance\n`);
      continue;
    }
    
    try {
      console.log(`💸 Funding ${wallet.name} with ${needed.toFixed(3)} SOL...`);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: masterKeypair.publicKey,
          toPubkey: new PublicKey(wallet.address),
          lamports: Math.floor(needed * 1e9),
        })
      );

      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [masterKeypair],
        {
          commitment: 'confirmed',
          maxRetries: 3
        }
      );

      console.log(`✓ Funded! Tx: ${signature.slice(0, 8)}...${signature.slice(-8)}\n`);
      
      // Small delay between transfers
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to fund ${wallet.name}:`, error);
      return;
    }
  }
  
  console.log("🎉 ALL WALLETS FUNDED!");
  console.log("\nRun 'npm run raid:check' to verify");
  console.log("Then 'npm run raid:execute' to launch the 15 SOL MEGA RAID! 🚀");
}

directMasterFunding().catch(console.error);