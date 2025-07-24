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
const connection = new web3_js_1.Connection("https://api.mainnet-beta.solana.com", "confirmed");
async function run() {
    const burner = (0, phantomUtils_1.decodeBurnerKeypair)();
    const burnerPubkey = burner.publicKey;
    console.log(`🧨 Scanning wallet: ${burnerPubkey.toBase58()} for SPL tokens...`);
    // Use native Web3.js method to fetch parsed SPL token accounts
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(burnerPubkey, { programId: spl_token_1.TOKEN_PROGRAM_ID });
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
        const mint = new web3_js_1.PublicKey(acc.account.data.parsed.info.mint);
        const rawAmount = acc.account.data.parsed.info.tokenAmount.amount;
        console.log(`🔥 Burning ${rawAmount} of token: ${mint.toBase58()}`);
        try {
            const sig = await (0, spl_token_1.burn)(connection, burner, tokenAccountPubkey, mint, burnerPubkey, BigInt(rawAmount));
            await connection.confirmTransaction(sig, "confirmed");
            console.log(`✅ Burned successfully. TX: https://solscan.io/tx/${sig}`);
        }
        catch (err) {
            console.error(`❌ Burn failed for token ${mint.toBase58()}:`, err);
        }
    }
    console.log("🏁 All SPL token burns complete.");
}
run().catch((err) => {
    console.error("🚨 Unhandled error during burn process:", err);
});
//# sourceMappingURL=burn.js.map