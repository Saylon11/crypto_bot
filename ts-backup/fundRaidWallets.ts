import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Transfer function
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

    console.log(`✓ Sent ${amount.toFixed(3)} SOL`);
    console.log(`✓ Tx: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
  } catch (error) {
    console.error(`❌ Transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function completeFunding() {
  console.log("🦉 COMPLETING RAID WALLET FUNDING");
  console.log("==================================\n");

  const connection = new Connection(rpcUrl);

  // Load wallets
  const wallet1 = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_1!));
  const wallet2Public = new PublicKey("DRnNH2TGGvdFpB4nkQ4qSnGWKwzDDqjR63H3JkjjnaqM");
  
  const wallet3 = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_3!));
  const wallet4Public = new PublicKey("65UBnoSyUKwaPMNB56mZiPigrM4prFJdUGutEXMnBFfu");
  
  const wallet5Public = new PublicKey("D4d1i8VYf8eN3gUkYpSu4dLUDvBKAKnRz4n4tXbWxEDF");

  // Check current balances
  console.log("📊 Current Balances:");
  const balance1 = await connection.getBalance(wallet1.publicKey);
  const balance3 = await connection.getBalance(wallet3.publicKey);
  console.log(`Wallet 1: ${(balance1 / 1e9).toFixed(3)} SOL`);
  console.log(`Wallet 3: ${(balance3 / 1e9).toFixed(3)} SOL\n`);

  // Complete cascade transfers
  console.log("🔄 Completing cascade transfers:\n");

  // Wallet 1 → Wallet 2
  console.log("💸 Wallet 1 (Shock) → Wallet 2 (FOMO)");
  await transferSOL(connection, wallet1, wallet2Public, 2.25);
  console.log();

  await new Promise(resolve => setTimeout(resolve, 2000));

  // Wallet 3 → Wallet 4
  console.log("💸 Wallet 3 (Momentum) → Wallet 4 (Surge)");
  await transferSOL(connection, wallet3, wallet4Public, 2.25);
  console.log();

  // For Wallet 5, we need to check if master has any SOL left
  const masterPrivateKey = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];
  const masterKeypair = Keypair.fromSecretKey(new Uint8Array(masterPrivateKey));
  
  const masterBalance = await connection.getBalance(masterKeypair.publicKey);
  console.log(`\n💰 Master wallet balance: ${(masterBalance / 1e9).toFixed(3)} SOL`);
  
  if (masterBalance / 1e9 > 3.05) {
    console.log("\n💸 Master → Wallet 5 (Bond Finisher)");
    await transferSOL(connection, masterKeypair, wallet5Public, 3.0);
    console.log("\n✅ ALL WALLETS FUNDED!");
  } else {
    console.log("\n⚠️  Master wallet has insufficient balance for Wallet 5");
    console.log(`Need 3.05 SOL but only have ${(masterBalance / 1e9).toFixed(3)} SOL`);
    
    // Check if we can redistribute from other wallets
    const excess1 = (balance1 / 1e9) - 5.2 - 2.25 - 0.05; // What's left after funding wallet 2
    const excess3 = (balance3 / 1e9) - 2.3 - 2.25 - 0.05; // What's left after funding wallet 4
    
    if (excess1 > 0 || excess3 > 0) {
      console.log("\n💡 Can redistribute excess from other wallets:");
      console.log(`Wallet 1 excess: ${excess1.toFixed(3)} SOL`);
      console.log(`Wallet 3 excess: ${excess3.toFixed(3)} SOL`);
    }
  }

  console.log("\n🏁 Funding operation complete!");
  console.log("Run 'npm run raid:check' to verify final status");
}

completeFunding().catch(console.error);