"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeSwapTransaction = executeSwapTransaction;
const web3_js_1 = require("@solana/web3.js");
const qnAPI_1 = require("../qnAPI"); // Updated to include .js extension
const bs58_1 = __importDefault(require("bs58"));
/**
 * Decodes, signs, sends, and confirms a swap transaction.
 * @param swapTransaction The base58-encoded transaction string.
 * @returns The transaction signature.
 */
async function executeSwapTransaction(swapTransaction) {
    try {
        console.log("🔄 Decoding the swap transaction...");
        const decodedTx = web3_js_1.Transaction.from(bs58_1.default.decode(swapTransaction));
        console.log("🔑 Signing the transaction with the wallet keypair...");
        decodedTx.sign(qnAPI_1.walletKeypair);
        console.log("📡 Sending the transaction to the Solana network...");
        const signature = await qnAPI_1.connection.sendRawTransaction(decodedTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: "confirmed",
        });
        console.log("⏳ Confirming the transaction...");
        await qnAPI_1.connection.confirmTransaction(signature, "confirmed");
        console.log("✅ Swap transaction executed successfully. Signature:", signature);
        return signature;
    }
    catch (error) {
        console.error("🚨 Error executing swap transaction:", error);
        throw error;
    }
}
//# sourceMappingURL=transactionUtils.js.map