// src/devTools/burnFatBear.ts

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

import bs58 from "bs58";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

// $FATBEAR token mint address
const FATBEAR_MINT = new PublicKey("DHCjYLPy4YhayNGCFnVTequ92thWtEcco1o2fGK9pump");

// Your dev wallet private key
const DEV_WALLET_PRIVATE_KEY = "32AnPKG1qRLAM1TMoDoWByMG82PNJv3VaBz9tzAcWMXQ6Qp8fYWoUvUbBHiwojG3xomqLTh1EJBgb2QE23npUiXw";

async function burnAllFatBear() {
  try {
    // Decode the private key
    const secretKeyUint8Array = bs58.decode(DEV_WALLET_PRIVATE_KEY);
    const devWallet = Keypair.fromSecretKey(secretKeyUint8Array);
    
    console.log(`🦊 FATBEAR Burn Script - Dev Wallet`);
    console.log(`📍 Dev Wallet: ${devWallet.publicKey.toBase58()}`);
    console.log(`🪙 Token to burn: $FATBEAR (${FATBEAR_MINT.toBase58()})`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Verify this is the correct wallet
    if (devWallet.publicKey.toBase58() !== "7vc7M4kqkcK4cLwDq4NxpBAF9823BS62Rjmvj1ud1YNq") {
      throw new Error("❌ Wallet address mismatch! Please check the private key.");
    }

    // Get the associated token account for FATBEAR
    const tokenAccountAddress = await getAssociatedTokenAddress(
      FATBEAR_MINT,
      devWallet.publicKey
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
        devWallet,
        tokenAccountAddress,
        FATBEAR_MINT,
        devWallet.publicKey,
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
║          🔥 FATBEAR DEV WALLET BURN SCRIPT 🔥        ║
║                                                      ║
║  Target: 7vc7M4kqkcK4cLwDq4NxpBAF9823BS62Rjmvj1ud1YNq ║
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