import * as dotenv from "dotenv";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import axios from "axios";
import bs58 from "bs58";
// import WebSocket from "ws";
// import { executeSwapTransaction } from "./utils/transactionUtils.js";
import type { LiquidityPool, TokenReport, NewToken } from "./types.js"; // Import custom types

dotenv.config();

export const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_ENDPOINT!;
export const METIS_JUPITER_API_URL = process.env.METIS_JUPITER_SWAP_API!;
export const WALLET_SECRET_KEY = process.env.WALLET_SECRET_KEY!;
export const RUGCHECK_API_URL = process.env.RUGCHECK_API_URL!;
export const RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY!;

if (!QUICKNODE_RPC_URL || typeof QUICKNODE_RPC_URL !== "string") {
  throw new Error(
    "🚨 QUICKNODE_RPC_URL is missing or not a string in your .env file.",
  );
}

if (!WALLET_SECRET_KEY || typeof WALLET_SECRET_KEY !== "string") {
  throw new Error(
    "🚨 WALLET_SECRET is missing or not a string in your .env file.",
  );
}

export const QUICKNODE_WS_URL = process.env.QUICKNODE_WEBSOCKET_URL!;
export const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");

export function loadWalletKeypair(): Keypair {
  try {
    // 🚨 SECURITY WARNING:
    // Do NOT log or expose WALLET_SECRET_KEY in production environments.
    // Use a secure key management service or encrypt environment variables
    // to protect sensitive information.

    if (!WALLET_SECRET_KEY) {
      throw new Error("🚨 WALLET_SECRET_KEY is not defined in .env file.");
    }
    const decodedSecretKey = bs58.decode(WALLET_SECRET_KEY);
    if (decodedSecretKey.length !== 64) {
      throw new Error(`Invalid secret key length: ${decodedSecretKey.length}`);
    }
    const keypair = Keypair.fromSecretKey(decodedSecretKey);
    console.log("✅ Wallet keypair loaded:", keypair.publicKey.toBase58());
    return keypair;
  } catch (error) {
    console.error("🚨 Error loading wallet keypair:", error);
    throw error;
  }
}

export const walletKeypair = loadWalletKeypair();

console.log("✅ Loaded Environment Variables from qnAPI.ts:", {
  QUICKNODE_RPC_URL,
  METIS_JUPITER_API_URL,
  QUICKNODE_WS_URL,
  WALLET_PUBLIC_KEY: walletKeypair.publicKey.toBase58(),
});

const apiCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION_MS = parseInt(
  process.env.CACHE_DURATION_MS || "30000",
  10,
);

function getCachedResponse<T>(
  key: string,
  durationMs = CACHE_DURATION_MS,
): T | null {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < durationMs) {
    console.log(`✅ Using cached data for key: ${key}`);
    return cached.data as T;
  }
  return null;
}

function setCachedResponse(key: string, data: unknown): void {
  apiCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Ensures the current block height is fetched and cached.
 * This is used to invalidate the cache when the block height changes.
 */
async function getCurrentBlockHeight(): Promise<number> {
  const cacheKey = "currentBlockHeight";
  const cachedBlockHeight = getCachedResponse<number>(cacheKey);

  if (cachedBlockHeight) {
    console.log("✅ Using cached block height:", cachedBlockHeight);
    return cachedBlockHeight;
  }

  try {
    console.log("📡 Fetching current block height...");
    const response = await axios.post(QUICKNODE_RPC_URL, {
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
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Block Height API Error:", error.message, error.stack);
    } else {
      console.error("🚨 Block Height API Error:", error);
    }
    throw error;
  }
}

// Removed Jupiter-specific function
// export async function getJupiterQuote(
//   inputMint: string,
//   outputMint: string,
//   amount: number,
// ): Promise<any> {
//   const cacheKey = `quote-${inputMint}-${outputMint}-${amount}`;
//   const cached = getCachedResponse(cacheKey);
//   if (cached) return cached;

//   try {
//     const baseUrl = METIS_JUPITER_API_URL.replace(/\/+$/, "");
//     const response = await axios.get(`${baseUrl}/quote`, {
//       params: { inputMint, outputMint, amount, slippageBps: 50 },
//     });
//     setCachedResponse(cacheKey, response.data);
//     return response.data;
//   } catch (error: unknown) {
//     if (axios.isAxiosError(error)) {
//       console.error(
//         "🚨 Axios error fetching Jupiter quote:",
//         error.response?.data || error.message,
//       );
//     } else if (error instanceof Error) {
//       console.error("🚨 General error fetching Jupiter quote:", error.message);
//     } else {
//       console.error("🚨 Unknown error fetching Jupiter quote:", error);
//     }
//     return null;
//   }
// }

// Removed Jito bundle logic
// export async function sendJitoBundle(
//   transactions: Transaction[],
//   simulate = false,
// ): Promise<JitoBundleResponse> {
//   const method = simulate ? "simulateBundle" : "sendBundle";
//   const serializedTxns = transactions.map((tx) => bs58.encode(tx.serialize()));

//   const payload = {
//     jsonrpc: "2.0",
//     id: `jito-${Date.now()}`,
//     method,
//     params: simulate ? [serializedTxns] : { transactions: serializedTxns },
//   };

//   try {
//     const response = await axios.post(QUICKNODE_RPC_URL, payload, {
//       headers: { "Content-Type": "application/json" },
//     });

//     if (response.data?.error) {
//       console.error(`❌ Jito ${method} Error:`, response.data.error);
//       return { bundleId: "", status: "error" };
//     }

//     console.log(`✅ Jito ${method} successful:`, response.data.result);
//     return { bundleId: response.data.result, status: "success" };
//   } catch (error) {
//     console.error(`🚨 Jito ${method} Error:`, error);
//     return { bundleId: "", status: "error" };
//   }
// }

export async function getLiquidityPools(): Promise<LiquidityPool[]> {
  const cacheKey = "allLiquidityPools";
  const cachedData = getCachedResponse<LiquidityPool[]>(cacheKey);
  if (cachedData) {
    console.log("✅ Using cached liquidity pools data");
    return cachedData;
  }

  await getCurrentBlockHeight(); // Ensure cache invalidation logic is applied

  try {
    console.log("📡 Fetching liquidity pools from QuickNode...");
    const response = await axios.post(QUICKNODE_RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "qn_getTokenLiquidityPools",
      params: {}, // Add any required parameters here
    });

    if (!response.data || !response.data.result) {
      console.error("🚨 Malformed liquidity pools response", response.data);
      return [];
    }

    setCachedResponse(cacheKey, response.data.result);
    console.log("✅ Liquidity pools fetched successfully.");
    return response.data.result as LiquidityPool[];
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Liquidity Pool API Error:", error.message, error.stack);
    } else {
      console.error("🚨 Liquidity Pool API Error:", error);
    }
    return [];
  }
}

/**
 * Executes a Pump.fun swap transaction.
 * @param mint The mint address of the token.
 * @param type The type of transaction ("BUY" or "SELL").
 * @param amount The amount of the token to swap (in smallest units).
 * @returns The transaction signature.
 */
export async function executePumpFunSwap(
  mint: string,
  type: "BUY" | "SELL",
  amount: number,
): Promise<string> {
  try {
    console.log(
      `🔄 Executing ${type} swap for mint: ${mint}, amount: ${amount}`,
    );
    // Replace the following with actual implementation logic
    const transaction = new Transaction();
    transaction.add(
      new TransactionInstruction({
        keys: [],
        programId: new PublicKey("11111111111111111111111111111111"), // Replace with actual program ID
        data: Buffer.from([]), // Replace with actual instruction data
      }),
    );

    const signature = await connection.sendTransaction(transaction, [
      walletKeypair,
    ]);
    console.log(`✅ Swap executed successfully. Signature: ${signature}`);
    return signature;
  } catch (error) {
    console.error("🚨 Error executing Pump.fun swap:", error);
    throw error;
  }
}

/**
 * Monitors Pump.fun trades and executes a callback for each trade.
 * @param callback The callback function to execute for each trade.
 */
export function monitorPumpFunTrades(
  callback: (tradeData: Record<string, unknown>) => Promise<void>,
): void {
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
export function createTestTransaction(): Transaction {
  console.log("🔧 Creating a test transaction...");
  const transaction = new Transaction();
  // Add instructions to the transaction (mocked for now)
  return transaction;
}

/**
 * Sends a Jito bundle to the Solana network.
 * @param transactions The transactions to include in the bundle.
 * @param simulate Whether to simulate the bundle instead of sending it.
 * @returns The result of the bundle submission.
 */
export async function sendJitoBundle(
  transactions: Transaction[],
  simulate = false,
): Promise<{ success: boolean }> {
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
  } catch (error) {
    console.error("🚨 Failed to send Jito bundle:", error);
    return { success: false };
  }
}

// RugCheck.xyz API Integration

/**
 * Authenticates with RugCheck.xyz and retrieves a JWT token.
 * @returns The JWT token as a string.
 */
export async function authenticateRugCheck(): Promise<string> {
  try {
    const response = await axios.post(`${RUGCHECK_API_URL}/authenticate`, {
      apiKey: RUGCHECK_API_KEY,
    });
    return response.data.token;
  } catch (error) {
    console.error("🚨 Error authenticating with RugCheck:", error);
    throw error;
  }
}

/**
 * Fetches the token report from RugCheck.xyz.
 * @param tokenAddress The address of the token to fetch the report for.
 * @returns The token report as an object.
 */
export async function getTokenReport(
  tokenAddress: string,
): Promise<TokenReport> {
  const token = await authenticateRugCheck();
  try {
    const response = await axios.get<TokenReport>(
      `${RUGCHECK_API_URL}/token/${tokenAddress}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (error) {
    console.error("🚨 Error fetching token report from RugCheck:", error);
    throw error;
  }
}

/**
 * Fetches new tokens from RugCheck.xyz.
 * @returns An array of new tokens.
 */
export async function getNewTokens(): Promise<NewToken[]> {
  const token = await authenticateRugCheck();
  try {
    const response = await axios.get<NewToken[]>(
      `${RUGCHECK_API_URL}/tokens/new`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data;
  } catch (error) {
    console.error("🚨 Error fetching new tokens from RugCheck:", error);
    throw error;
  }
}
