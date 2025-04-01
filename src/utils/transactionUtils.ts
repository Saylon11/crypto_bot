import { Transaction } from "@solana/web3.js";
import { connection, walletKeypair } from "../qnAPI";
import bs58 from "bs58";

/**
 * Decodes, signs, sends, and confirms a swap transaction.
 * @param swapTransaction The base58-encoded transaction string.
 * @returns The transaction signature.
 */
export async function executeSwapTransaction(
  swapTransaction: string,
): Promise<string> {
  try {
    console.log("🔄 Decoding the swap transaction...");
    const decodedTx = Transaction.from(bs58.decode(swapTransaction));

    console.log("🔑 Signing the transaction with the wallet keypair...");
    decodedTx.sign(walletKeypair);

    console.log("📡 Sending the transaction to the Solana network...");
    const signature = await connection.sendRawTransaction(
      decodedTx.serialize(),
      {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      },
    );

    console.log("⏳ Confirming the transaction...");
    await connection.confirmTransaction(signature, "confirmed");

    console.log(
      "✅ Swap transaction executed successfully. Signature:",
      signature,
    );
    return signature;
  } catch (error) {
    console.error("🚨 Error executing swap transaction:", error);
    throw error;
  }
}
