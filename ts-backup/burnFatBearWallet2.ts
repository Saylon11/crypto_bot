// src/devTools/burnFatBearWallet2.ts

import dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  PublicKey,
  Keypair,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  burn,
  getAssociatedTokenAddress,
  getAccount,
} from "@solana/spl-token";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// $FATBEAR token mint address
const FATBEAR_MINT = new PublicKey("DHCjYLPy4YhayNGCFnVTequ92thWtEcco1o2fGK9pump");

// Wallet private key as Uint8Array
const WALLET_SECRET_KEY = new Uint8Array([
  254,167,108,61,66,132,7,179,228,102,219,201,142,59,104,130,
  9,134,32,59,40,177,225,213,128,51,224,127,122,43,246,32,
  236,193,158,68,250,198,53,83,27,177,251,99,109,126,84,41,
  153,132,156,134,60,203,58,216,87,194,150,112,19,223,142,60
]);

async function burnAllFatBear() {
  try {
    // Create keypair from the secret key array
    const wallet = Keypair.fromSecretKey(WALLET_SECRET_KEY);
    
    console.log(`🦊 FATBEAR Burn Script - Wallet 2`);
    console.log(`📍 Wallet: ${wallet.publicKey.toBase58()}`);
    console.log(`🪙 Token to burn: $FATBEAR (${FATBEAR_MINT.toBase58()})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Verify this is the correct wallet
    if (wallet.publicKey.toBase58() !== "GwCTJzcpQrTeaBZN64KFkNxwVkS95YV78bgkbR29VkCs") {
      throw new Error("❌ Wallet address mismatch! Please check the private key.");
    }

    // Get the associated token account for FATBEAR
    const tokenAccountAddress = await getAssociatedTokenAddress(
      FATBEAR_MINT,
      wallet.publicKey
    );

    // Check if the token account exists and get balance
    try {
      const tokenAccount = await getAccount(connection, tokenAccountAddress);
      const balance = tokenAccount.amount;
      
      if (balance === 0n) {
        console.log("✅ No FATBEAR tokens to burn. Wallet already clean.");
        return;
      }

      console.log(`🔥 Found ${balance.toString()} FATBEAR tokens to burn`);
      console.log(`🚀 Initiating burn transaction...`);

      // Burn all FATBEAR tokens
      const sig = await burn(
        connection,
        wallet,
        tokenAccountAddress,
        FATBEAR_MINT,
        wallet.publicKey,
        balance
      );

      console.log(`⏳ Confirming transaction...`);
      await connection.confirmTransaction(sig, "confirmed");
      
      console.log(`✅ Successfully burned all FATBEAR tokens!`);
      console.log(`📊 Transaction: https://solscan.io/tx/${sig}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`💰 SOL balance remains untouched in your wallet`);
      
    } catch (error: any) {
      if (error.message?.includes("could not find account")) {
        console.log("✅ No FATBEAR token account found. Nothing to burn.");
      } else {
        throw error;
      }
    }

  } catch (err) {
    console.error(`❌ Error during burn process:`, err);
    throw err;
  }
}

// Execute the burn
console.log(`
╔══════════════════════════════════════════════════════╗
║            🔥 FATBEAR BURN SCRIPT - WALLET 2 🔥      ║
║                                                      ║
║  Target: GwCTJzcpQrTeaBZN64KFkNxwVkS95YV78bgkbR29VkCs ║
║  This will burn ALL $FATBEAR tokens                 ║
║  SOL balance will remain untouched                  ║
╚══════════════════════════════════════════════════════╝
`);

burnAllFatBear()
  .then(() => {
    console.log("\n🏁 Burn process completed successfully!");
  })
  .catch((err) => {
    console.error("\n🚨 Unhandled error during burn process:", err);
    process.exit(1);
  });