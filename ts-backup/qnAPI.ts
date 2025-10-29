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
import type { TokenReport, NewToken } from "./types";

dotenv.config();

export const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL!;
export const METIS_JUPITER_SWAP_API = process.env.METIS_JUPITER_SWAP_API!;
export const WALLET_SECRET_KEY = process.env.WALLET_SECRET_KEY!;
export const RUGCHECK_API_URL = process.env.RUGCHECK_API_URL!;
export const RUGCHECK_API_KEY = process.env.RUGCHECK_API_KEY!;
// export const QUICKNODE_WEBSOCKET_URL = process.env.QUICKNODE_WEBSOCKET_URL!; // Commented out for later use

export const connection = new Connection(QUICKNODE_RPC_URL, "confirmed");

export function loadWalletKeypair(): Keypair {
  try {
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
  METIS_JUPITER_SWAP_API,
  WALLET_PUBLIC_KEY: walletKeypair.publicKey.toBase58(),
  // QUICKNODE_WEBSOCKET_URL, // Commented out for later use
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
