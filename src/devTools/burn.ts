// src/devTools/burn.ts

import dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  burn,
} from "@solana/spl-token";

import { decodeBurnerKeypair } from "../utils/phantomUtils";

const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function run() {
  const burner = decodeBurnerKeypair();
  const burnerPubkey = burner.publicKey;

  console.log(`🧨 Scanning wallet: ${burnerPubkey.toBase58()} for SPL tokens...`);

  // Use native Web3.js method to fetch parsed SPL token accounts
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    burnerPubkey,
    { programId: TOKEN_PROGRAM_ID }
  );

  const splAccounts = tokenAccounts.value.filter((acc) => {
    const amount = acc.account.data.parsed.info.tokenAmount.uiAmount;
    return amount && amount > 0;
  });

  if (splAccounts.length === 0) {
    console.log("✅ No SPL tokens to burn. Wallet is clean.");
    return;
  }

  for (const acc of splAccounts) {
    const tokenAccountPubkey = acc.pubkey;
    const mint = new PublicKey(acc.account.data.parsed.info.mint);
    const rawAmount = acc.account.data.parsed.info.tokenAmount.amount;

    console.log(`🔥 Burning ${rawAmount} of token: ${mint.toBase58()}`);

    try {
      const sig = await burn(
        connection,
        burner,
        tokenAccountPubkey,
        mint,
        burnerPubkey,
        BigInt(rawAmount)
      );

      await connection.confirmTransaction(sig, "confirmed");
      console.log(`✅ Burned successfully. TX: https://solscan.io/tx/${sig}`);
    } catch (err) {
      console.error(`❌ Burn failed for token ${mint.toBase58()}:`, err);
    }
  }

  console.log("🏁 All SPL token burns complete.");
}

run().catch((err) => {
  console.error("🚨 Unhandled error during burn process:", err);
});