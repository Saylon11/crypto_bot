"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodePhantomKeypair = decodePhantomKeypair;
exports.decodeBurnerKeypair = decodeBurnerKeypair;
exports.decodeHootBotKeypair = decodeHootBotKeypair;
var bs58_1 = __importDefault(require("bs58"));
var web3_js_1 = require("@solana/web3.js");
var fs_1 = __importDefault(require("fs"));
/**
 * Decodes a Phantom wallet secret key from the environment variable `PHANTOM_SECRET_KEY`
 * into a Solana Keypair.
 * @returns {Keypair} The decoded Solana Keypair.
 */
function decodePhantomKeypair() {
    var secretKeyBase58 = process.env.PHANTOM_SECRET_KEY;
    if (!secretKeyBase58) {
        throw new Error("🚨 Environment variable PHANTOM_SECRET_KEY is missing.");
    }
    try {
        // Decode the Base58-encoded secret key
        var secretKeyUint8Array = bs58_1.default.decode(secretKeyBase58);
        // Validate the length of the decoded secret key
        if (secretKeyUint8Array.length !== 64) {
            throw new Error("\uD83D\uDEA8 Invalid secret key length: expected 64 bytes, got ".concat(secretKeyUint8Array.length, "."));
        }
        // Create and return the Solana Keypair
        var keypair = web3_js_1.Keypair.fromSecretKey(secretKeyUint8Array);
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
/**
 * Decodes the burner wallet keypair from the environment variable `BURNER_SECRET_KEY`.
 * @returns {Keypair} The burner Solana Keypair.
 */
function decodeBurnerKeypair() {
    var secretKeyBase58 = process.env.BURNER_SECRET_KEY;
    if (!secretKeyBase58) {
        throw new Error("🚨 Environment variable BURNER_SECRET_KEY is missing.");
    }
    try {
        var secretKeyUint8Array = bs58_1.default.decode(secretKeyBase58);
        if (secretKeyUint8Array.length !== 64) {
            throw new Error("\uD83D\uDEA8 Invalid burner secret key length: expected 64 bytes, got ".concat(secretKeyUint8Array.length, "."));
        }
        var keypair = web3_js_1.Keypair.fromSecretKey(secretKeyUint8Array);
        console.log("🔥 Burner wallet keypair decoded successfully.");
        return keypair;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("🚨 Error decoding Burner wallet keypair:", error.message);
        }
        else {
            console.error("🚨 Error decoding Burner wallet keypair:", error);
        }
        throw error;
    }
}
/**
 * Decodes the HootBot wallet keypair.
 * First tries to load from HOOTBOT_KEYPAIR_PATH file,
 * then falls back to WALLET_SECRET_KEY base58 string.
 * @returns {Keypair} The HootBot Solana Keypair.
 */
function decodeHootBotKeypair() {
    // First try to load from keypair file
    var keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
    if (keypairPath && fs_1.default.existsSync(keypairPath)) {
        try {
            var keypairData = JSON.parse(fs_1.default.readFileSync(keypairPath, 'utf-8'));
            var keypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(keypairData));
            console.log("🦉 HootBot wallet keypair loaded from file successfully.");
            console.log("\uD83E\uDD89 Wallet address: ".concat(keypair.publicKey.toBase58()));
            return keypair;
        }
        catch (error) {
            console.warn("⚠️ Failed to load keypair from file, falling back to WALLET_SECRET_KEY");
        }
    }
    // Fall back to base58 encoded secret key
    var secretKeyBase58 = process.env.WALLET_SECRET_KEY;
    if (!secretKeyBase58) {
        throw new Error("🚨 Neither HOOTBOT_KEYPAIR_PATH nor WALLET_SECRET_KEY is available.");
    }
    try {
        var secretKeyUint8Array = bs58_1.default.decode(secretKeyBase58);
        if (secretKeyUint8Array.length !== 64) {
            throw new Error("\uD83D\uDEA8 Invalid HootBot secret key length: expected 64 bytes, got ".concat(secretKeyUint8Array.length, "."));
        }
        var keypair = web3_js_1.Keypair.fromSecretKey(secretKeyUint8Array);
        console.log("🦉 HootBot wallet keypair decoded successfully from base58.");
        console.log("\uD83E\uDD89 Wallet address: ".concat(keypair.publicKey.toBase58()));
        return keypair;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("🚨 Error decoding HootBot wallet keypair:", error.message);
        }
        else {
            console.error("🚨 Error decoding HootBot wallet keypair:", error);
        }
        throw error;
    }
}
