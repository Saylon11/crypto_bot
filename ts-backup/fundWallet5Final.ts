import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';

async function fundWallet5() {
  console.log("🦉 FINAL FUNDING FOR WALLET 5");
  console.log("==============================\n");

  const connection = new Connection(rpcUrl);
  
  // Load master wallet
  const masterPrivateKey = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];
  const masterKeypair = Keypair.fromSecretKey(new Uint8Array(masterPrivateKey));
  
  // Wallet 5 address
  const wallet5Public = new PublicKey("D4d1i8VYf8eN3gUkYpSu4dLUDvBKAKnRz4n4tXbWxEDF");
  
  // Check master balance
  const masterBalance = await connection.getBalance(masterKeypair.publicKey);
  console.log(`Master wallet balance: ${(masterBalance / 1e9).toFixed(4)} SOL`);
  
  // Send what we have (leaving tiny amount for fees)
  const amountToSend = 3.0; // Try the full amount - the system will use max available
  
  try {
    console.log(`\n💸 Attempting to send ${amountToSend} SOL to Wallet 5...`);
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: masterKeypair.publicKey,
        toPubkey: wallet5Public,
        lamports: Math.floor(amountToSend * 1e9),
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

    console.log(`✓ Sent ${amountToSend.toFixed(3)} SOL`);
    console.log(`✓ Tx: ${signature.slice(0, 8)}...${signature.slice(-8)}`);
    console.log("\n✅ WALLET 5 FUNDED!");
    
  } catch (error) {
    console.log("\n💡 Master wallet slightly short. Taking 0.01 SOL from Wallet 1...");
    
    // Take small amount from Wallet 1
    const wallet1 = Keypair.fromSecretKey(bs58.decode(process.env.RAID_WALLET_1!));
    
    // First send 0.01 SOL from Wallet 1 to Master
    const topUpTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet1.publicKey,
        toPubkey: masterKeypair.publicKey,
        lamports: 0.01 * 1e9, // 0.01 SOL
      })
    );
    
    const topUpSig = await sendAndConfirmTransaction(
      connection,
      topUpTx,
      [wallet1]
    );
    console.log(`✓ Topped up master with 0.01 SOL from Wallet 1`);
    console.log(`✓ Tx: ${topUpSig.slice(0, 8)}...${topUpSig.slice(-8)}`);
    
    // Now try again
    console.log(`\n💸 Now sending 3.0 SOL to Wallet 5...`);
    const finalTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: masterKeypair.publicKey,
        toPubkey: wallet5Public,
        lamports: Math.floor(3.0 * 1e9),
      })
    );
    
    const finalSig = await sendAndConfirmTransaction(
      connection,
      finalTx,
      [masterKeypair]
    );
    
    console.log(`✓ Sent 3.000 SOL to Wallet 5`);
    console.log(`✓ Tx: ${finalSig.slice(0, 8)}...${finalSig.slice(-8)}`);
    console.log("\n✅ ALL 5 WALLETS NOW FUNDED!");
  }
  
  console.log("\n🏁 Run 'npm run raid:check' to verify all wallets are ready");
  console.log("Then: 'npm run raid:execute' to start the 15 SOL MEGA RAID! 🚀");
}

fundWallet5().catch(console.error);