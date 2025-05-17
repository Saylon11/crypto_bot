// src/devTools/burn.ts

import dotenv from "dotenv";
dotenv.config();

import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";

import {
  TOKEN_PROGRAM_ID,
  burn,
  getAccount,
} from "@solana/spl-token";

import { decodeBurnerKeypair } from "../utils/phantomUtils";
import { burnWallets } from "./burnRegistry";

// ✅ Verified OILC Mint + Token Account Address
const TOKEN_MINT = new PublicKey("Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump");
const BURN_ADDRESS = new PublicKey("11111111111111111111111111111111");
const sourceTokenAccount = new PublicKey("GGziYaNVaqYJqkJME1fWRLreD7ToANRLoQ37cX9UbsZp");
const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");

async function run() {
  const burner = decodeBurnerKeypair();
  const accountInfo = await getAccount(connection, sourceTokenAccount);
  const amount = accountInfo.amount;
    
  console.log(`🔥 Burning ${amount} $OILC from wallet: ${burner.publicKey.toBase58()}`);

  // Validate the token account before proceeding
  try {
    const tokenAccountInfo = await getAccount(connection, sourceTokenAccount);
    console.log("✅ Token account is valid SPL structure:", tokenAccountInfo);
  } catch (e) {
    console.error("❌ Invalid SPL token account. Cannot proceed with burn:", e);
    return;
  }

  const signature = await burn(
    connection,
    burner, // payer
    sourceTokenAccount,
    TOKEN_MINT,
    burner.publicKey,
    amount
  );

  await connection.confirmTransaction(signature, "confirmed");
  console.log("✅ Burn successful! TX Signature:", signature);
}

run().catch((err) => {
  console.error("🚨 Burn failed:", err);
});