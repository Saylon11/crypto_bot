import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Master wallet private key
const masterPrivateKey = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];

async function redistributeFunds() {
  console.log("🦉 REDISTRIBUTING FUNDS FOR OPTIMAL RAID");
  console.log("========================================\n");

  const connection = new Connection(rpcUrl);
  const masterKeypair = Keypair.fromSecretKey(new Uint8Array(masterPrivateKey));
  
  // Load Wallet 5 (has excess funds)
  const wallet5 = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_5!));
  
  // Check balances
  console.log("📊 Current balances:");
  const masterBalance = await connection.getBalance(masterKeypair.publicKey);
  const wallet5Balance = await connection.getBalance(wallet5.publicKey);
  
  console.log(`Master wallet: ${(masterBalance / 1e9).toFixed(3)} SOL`);
  console.log(`Wallet 5: ${(wallet5Balance / 1e9).toFixed(3)} SOL (needs only 3 SOL)`);
  
  // Wallet 5 has ~7 SOL but only needs 3 SOL, so we can take 3.8 SOL
  const excessFromWallet5 = 3.8; // Taking 3.8 SOL, leaving 3.2 SOL for raids + fees
  
  console.log(`\n💸 Taking ${excessFromWallet5} SOL from Wallet 5 back to Master...`);
  
  try {
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet5.publicKey,
        toPubkey: masterKeypair.publicKey,
        lamports: Math.floor(excessFromWallet5 * 1e9),
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet5],
      {
        commitment: 'confirmed',
        maxRetries: 3
      }
    );

    console.log(`✓ Transferred! Tx: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
    
  } catch (error) {
    console.error(`❌ Failed to transfer from Wallet 5:`, error);
    return;
  }
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Now fund the other wallets
  console.log("\n📊 Now funding wallets from Master:\n");
  
  const fundingTargets = [
    { 
      address: "5aCcVYe1UqNyW7T6MJgGxHbNC68DTG8bETSHKGraZLab",
      name: "Wallet 1",
      currentBalance: 0.358,
      targetAmount: 5.2,
      needed: 4.85
    },
    { 
      address: "DRnNH2TGGvdFpB4nkQ4qSnGWKwzDDqjR63H3JkjjnaqM",
      name: "Wallet 2",
      currentBalance: 0.748,
      targetAmount: 2.25,
      needed: 1.51
    },
    { 
      address: "B4To1EPQUTknxAtLsWXb8XNE6eCxF4JSbqAbvCPdGJpz",
      name: "Wallet 3",
      currentBalance: 0.979,
      targetAmount: 2.3,
      needed: 1.33
    },
    { 
      address: "65UBnoSyUKwaPMNB56mZiPigrM4prFJdUGutEXMnBFfu",
      name: "Wallet 4",
      currentBalance: 0.748,
      targetAmount: 2.25,
      needed: 1.51
    }
  ];
  
  for (const wallet of fundingTargets) {
    try {
      console.log(`💸 Funding ${wallet.name} with ${wallet.needed.toFixed(3)} SOL...`);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: masterKeypair.publicKey,
          toPubkey: new PublicKey(wallet.address),
          lamports: Math.floor(wallet.needed * 1e9),
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
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to fund ${wallet.name}:`, error);
      return;
    }
  }
  
  console.log("🎉 ALL WALLETS PROPERLY FUNDED!");
  console.log("\n📊 Expected final balances:");
  console.log("Wallet 1: ~5.2 SOL");
  console.log("Wallet 2: ~2.25 SOL");
  console.log("Wallet 3: ~2.3 SOL");
  console.log("Wallet 4: ~2.25 SOL");
  console.log("Wallet 5: ~3.2 SOL");
  console.log("\nRun 'npm run raid:check' to verify");
  console.log("Then 'npm run raid:execute' to launch the 15 SOL MEGA RAID! 🚀");
}

redistributeFunds().catch(console.error);