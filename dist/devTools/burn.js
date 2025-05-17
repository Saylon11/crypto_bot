"use strict";
// src/devTools/burn.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const phantomUtils_1 = require("../utils/phantomUtils");
// ✅ Verified OILC Mint + Token Account Address
const TOKEN_MINT = new web3_js_1.PublicKey("Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump");
const BURN_ADDRESS = new web3_js_1.PublicKey("11111111111111111111111111111111");
const sourceTokenAccount = new web3_js_1.PublicKey("GGziYaNVaqYJqkJME1fWRLreD7ToANRLoQ37cX9UbsZp");
const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com", "confirmed");
async function run() {
    const burner = (0, phantomUtils_1.decodeBurnerKeypair)();
    const accountInfo = await (0, spl_token_1.getAccount)(connection, sourceTokenAccount);
    const amount = accountInfo.amount;
    console.log(`🔥 Burning ${amount} $OILC from wallet: ${burner.publicKey.toBase58()}`);
    // Validate the token account before proceeding
    try {
        const tokenAccountInfo = await (0, spl_token_1.getAccount)(connection, sourceTokenAccount);
        console.log("✅ Token account is valid SPL structure:", tokenAccountInfo);
    }
    catch (e) {
        console.error("❌ Invalid SPL token account. Cannot proceed with burn:", e);
        return;
    }
    const signature = await (0, spl_token_1.burn)(connection, burner, // payer
    sourceTokenAccount, TOKEN_MINT, burner.publicKey, amount);
    await connection.confirmTransaction(signature, "confirmed");
    console.log("✅ Burn successful! TX Signature:", signature);
}
run().catch((err) => {
    console.error("🚨 Burn failed:", err);
});
//# sourceMappingURL=burn.js.map