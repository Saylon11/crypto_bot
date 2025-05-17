"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePhantomKeypair = decodePhantomKeypair;
const bs58_1 = __importDefault(require("bs58"));
const web3_js_1 = require("@solana/web3.js");
/**
 * Decodes a Phantom wallet secret key from the environment variable `PHANTOM_SECRET_KEY`
 * into a Solana Keypair.
 * @returns {Keypair} The decoded Solana Keypair.
 */
function decodePhantomKeypair() {
    const secretKeyBase58 = process.env.PHANTOM_SECRET_KEY;
    if (!secretKeyBase58) {
        throw new Error("🚨 Environment variable PHANTOM_SECRET_KEY is missing.");
    }
    try {
        // Decode the Base58-encoded secret key
        const secretKeyUint8Array = bs58_1.default.decode(secretKeyBase58);
        // Validate the length of the decoded secret key
        if (secretKeyUint8Array.length !== 64) {
            throw new Error(`🚨 Invalid secret key length: expected 64 bytes, got ${secretKeyUint8Array.length}.`);
        }
        // Create and return the Solana Keypair
        const keypair = web3_js_1.Keypair.fromSecretKey(secretKeyUint8Array);
        console.log("✅ Phantom wallet keypair decoded successfully.");
        return keypair;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("🚨 Error decoding Phantom wallet keypair:", error.message);
        }
        else {
            console.error("🚨 Error decoding Phantom wallet keypair:", error);
        }
        throw error;
    }
}
//# sourceMappingURL=phantomUtils.js.map