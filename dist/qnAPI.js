"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walletKeypair = exports.connection = exports.RUGCHECK_API_KEY = exports.RUGCHECK_API_URL = exports.WALLET_SECRET_KEY = exports.METIS_JUPITER_SWAP_API = exports.QUICKNODE_RPC_URL = void 0;
exports.loadWalletKeypair = loadWalletKeypair;
exports.executePumpFunSwap = executePumpFunSwap;
exports.monitorPumpFunTrades = monitorPumpFunTrades;
exports.createTestTransaction = createTestTransaction;
exports.sendJitoBundle = sendJitoBundle;
exports.authenticateRugCheck = authenticateRugCheck;
exports.getTokenReport = getTokenReport;
exports.getNewTokens = getNewTokens;
const dotenv = __importStar(require("dotenv"));
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const bs58_1 = __importDefault(require("bs58"));
dotenv.config();
exports.QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL;
exports.METIS_JUPITER_SWAP_API = process.env.METIS_JUPITER_SWAP_API;
exports.WALLET_SECRET_KEY = process.env.WALLET_SECRET_KEY;
exports.RUGCHECK_API_URL = process.env.RUGCHECK_API_URL;
exports.RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY;
// export const QUICKNODE_WEBSOCKET_URL = process.env.QUICKNODE_WEBSOCKET_URL!; // Commented out for later use
exports.connection = new web3_js_1.Connection(exports.QUICKNODE_RPC_URL, "confirmed");
function loadWalletKeypair() {
    try {
        if (!exports.WALLET_SECRET_KEY) {
            throw new Error("🚨 WALLET_SECRET_KEY is not defined in .env file.");
        }
        const decodedSecretKey = bs58_1.default.decode(exports.WALLET_SECRET_KEY);
        if (decodedSecretKey.length !== 64) {
            throw new Error(`Invalid secret key length: ${decodedSecretKey.length}`);
        }
        const keypair = web3_js_1.Keypair.fromSecretKey(decodedSecretKey);
        console.log("✅ Wallet keypair loaded:", keypair.publicKey.toBase58());
        return keypair;
    }
    catch (error) {
        console.error("🚨 Error loading wallet keypair:", error);
        throw error;
    }
}
exports.walletKeypair = loadWalletKeypair();
console.log("✅ Loaded Environment Variables from qnAPI.ts:", {
    QUICKNODE_RPC_URL: exports.QUICKNODE_RPC_URL,
    METIS_JUPITER_SWAP_API: exports.METIS_JUPITER_SWAP_API,
    WALLET_PUBLIC_KEY: exports.walletKeypair.publicKey.toBase58(),
    // QUICKNODE_WEBSOCKET_URL, // Commented out for later use
});
const apiCache = new Map();
const CACHE_DURATION_MS = parseInt(process.env.CACHE_DURATION_MS || "30000", 10);
function getCachedResponse(key, durationMs = CACHE_DURATION_MS) {
    const cached = apiCache.get(key);
    if (cached && Date.now() - cached.timestamp < durationMs) {
        console.log(`✅ Using cached data for key: ${key}`);
        return cached.data;
    }
    return null;
}
function setCachedResponse(key, data) {
    apiCache.set(key, { data, timestamp: Date.now() });
}
/**
 * Ensures the current block height is fetched and cached.
 * This is used to invalidate the cache when the block height changes.
 */
async function getCurrentBlockHeight() {
    const cacheKey = "currentBlockHeight";
    const cachedBlockHeight = getCachedResponse(cacheKey);
    if (cachedBlockHeight) {
        console.log("✅ Using cached block height:", cachedBlockHeight);
        return cachedBlockHeight;
    }
    try {
        console.log("📡 Fetching current block height...");
        const response = await axios_1.default.post(exports.QUICKNODE_RPC_URL, {
            jsonrpc: "2.0",
            id: 1,
            method: "getBlockHeight",
            params: [],
        });
        if (!response.data || typeof response.data.result !== "number") {
            console.error("🚨 Malformed block height response", response.data);
            throw new Error("Failed to fetch block height");
        }
        const blockHeight = response.data.result;
        setCachedResponse(cacheKey, blockHeight);
        console.log("✅ Current block height fetched successfully:", blockHeight);
        return blockHeight;
    }
    catch (error) {
        if (error instanceof Error) {
            console.error("🚨 Block Height API Error:", error.message, error.stack);
        }
        else {
            console.error("🚨 Block Height API Error:", error);
        }
        throw error;
    }
}
/**
 * Executes a Pump.fun swap transaction.
 * @param mint The mint address of the token.
 * @param type The type of transaction ("BUY" or "SELL").
 * @param amount The amount of the token to swap (in smallest units).
 * @returns The transaction signature.
 */
async function executePumpFunSwap(mint, type, amount) {
    try {
        console.log(`🔄 Executing ${type} swap for mint: ${mint}, amount: ${amount}`);
        // Replace the following with actual implementation logic
        const transaction = new web3_js_1.Transaction();
        transaction.add(new web3_js_1.TransactionInstruction({
            keys: [],
            programId: new web3_js_1.PublicKey("11111111111111111111111111111111"), // Replace with actual program ID
            data: Buffer.from([]), // Replace with actual instruction data
        }));
        const signature = await exports.connection.sendTransaction(transaction, [
            exports.walletKeypair,
        ]);
        console.log(`✅ Swap executed successfully. Signature: ${signature}`);
        return signature;
    }
    catch (error) {
        console.error("🚨 Error executing Pump.fun swap:", error);
        throw error;
    }
}
/**
 * Monitors Pump.fun trades and executes a callback for each trade.
 * @param callback The callback function to execute for each trade.
 */
function monitorPumpFunTrades(callback) {
    console.log("📡 Monitoring Pump.fun trades...");
    // Simulated trade monitoring logic
    setInterval(() => {
        const mockTradeData = {
            mint: "So11111111111111111111111111111111111111112",
            volume: Math.random() * 1000,
            price: Math.random() * 10,
        };
        callback(mockTradeData);
    }, 5000); // Simulate a trade every 5 seconds
}
/**
 * Creates a test transaction for Jito bundle simulation.
 * @returns A test transaction.
 */
function createTestTransaction() {
    console.log("🔧 Creating a test transaction...");
    const transaction = new web3_js_1.Transaction();
    // Add instructions to the transaction (mocked for now)
    return transaction;
}
/**
 * Sends a Jito bundle to the Solana network.
 * @param transactions The transactions to include in the bundle.
 * @param simulate Whether to simulate the bundle instead of sending it.
 * @returns The result of the bundle submission.
 */
async function sendJitoBundle(transactions, simulate = false) {
    if (simulate) {
        console.log("🛠 Simulating Jito bundle submission...");
        // Explicitly simulate bundle logic (no real funds sent)
        return { success: true };
    }
    console.log("📡 Sending real Jito bundle...");
    try {
        // Explicitly implement real Jito bundle submission logic here
        // (Replace this comment with actual transaction sending logic using QuickNode RPC)
        return { success: true };
    }
    catch (error) {
        console.error("🚨 Failed to send Jito bundle:", error);
        return { success: false };
    }
}
// RugCheck.xyz API Integration
/**
 * Authenticates with RugCheck.xyz and retrieves a JWT token.
 * @returns The JWT token as a string.
 */
async function authenticateRugCheck() {
    try {
        const response = await axios_1.default.post(`${exports.RUGCHECK_API_URL}/authenticate`, {
            apiKey: exports.RUGCHECK_API_KEY,
        });
        return response.data.token;
    }
    catch (error) {
        console.error("🚨 Error authenticating with RugCheck:", error);
        throw error;
    }
}
/**
 * Fetches the token report from RugCheck.xyz.
 * @param tokenAddress The address of the token to fetch the report for.
 * @returns The token report as an object.
 */
async function getTokenReport(tokenAddress) {
    const token = await authenticateRugCheck();
    try {
        const response = await axios_1.default.get(`${exports.RUGCHECK_API_URL}/token/${tokenAddress}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    }
    catch (error) {
        console.error("🚨 Error fetching token report from RugCheck:", error);
        throw error;
    }
}
/**
 * Fetches new tokens from RugCheck.xyz.
 * @returns An array of new tokens.
 */
async function getNewTokens() {
    const token = await authenticateRugCheck();
    try {
        const response = await axios_1.default.get(`${exports.RUGCHECK_API_URL}/tokens/new`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    }
    catch (error) {
        console.error("🚨 Error fetching new tokens from RugCheck:", error);
        throw error;
    }
}
//# sourceMappingURL=qnAPI.js.map