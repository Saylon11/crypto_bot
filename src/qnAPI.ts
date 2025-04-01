import * as dotenv from "dotenv";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  ComputeBudgetProgram,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import axios from "axios";
import bs58 from "bs58";
import WebSocket from "ws";
import { executeSwapTransaction } from "./utils/transactionUtils";
import type { LiquidityPool, JitoBundleResponse, PumpFunQuote } from "./types"; // Import custom types

dotenv.config();

export const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_ENDPOINT!;
export const METIS_JUPITER_API_URL = process.env.METIS_JUPITER_SWAP_API!;
export const WALLET_SECRET_KEY = process.env.WALLET_SECRET_KEY!;

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

const requiredEnvVars = {
  QUICKNODE_RPC_URL,
  METIS_JUPITER_API_URL,
  WALLET_SECRET_KEY,
  QUICKNODE_WS_URL,
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error(
    `🚨 Missing required environment variables: ${missingVars.join(", ")}`,
  );
  process.exit(1);
}

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

// Commented out the unused function
// function clearCache(key: string) {
//   apiCache.delete(key);
// }

// Commented out the unused function
// function setCachedData(key: string, data: unknown): void {
//   apiCache.set(key, { data, timestamp: Date.now() });
// }

// Commented out the unused function
// function logSuccess(message: string, data?: unknown): void {
//   console.log(`✅ ${message}`, data || "");
// }

let cachedPriorityFee = 0;
let lastPriorityFeeFetchTime = 0;

export async function getPriorityFees(): Promise<number> {
  const now = Date.now();
  if (now - lastPriorityFeeFetchTime < 30000 && cachedPriorityFee > 0) {
    return cachedPriorityFee;
  }

  const DEFAULT_PRIORITY_FEE = 10000;
  try {
    const response = await axios.post(QUICKNODE_RPC_URL, {
      jsonrpc: "2.0",
      id: "priority-fee",
      method: "qn_estimatePriorityFees",
      params: {
        last_n_blocks: 100,
        api_version: 2,
      },
    });
    cachedPriorityFee =
      response.data?.result?.recommended || DEFAULT_PRIORITY_FEE;
    lastPriorityFeeFetchTime = now;
    return cachedPriorityFee;
  } catch {
    return DEFAULT_PRIORITY_FEE;
  }
}

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
) {
  const cacheKey = `quote-${inputMint}-${outputMint}-${amount}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  try {
    const baseUrl = METIS_JUPITER_API_URL.replace(/\/+$/, "");
    const response = await axios.get(`${baseUrl}/quote`, {
      params: { inputMint, outputMint, amount, slippageBps: 50 },
    });
    setCachedResponse(cacheKey, response.data);
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "🚨 Axios error fetching Jupiter quote:",
        error.response?.data || error.message,
      );
    } else if (error instanceof Error) {
      console.error("🚨 General error fetching Jupiter quote:", error.message);
    } else {
      console.error("🚨 Unknown error fetching Jupiter quote:", error);
    }
    return null;
  }
}

let cachedBlockHeight = 0;
let lastBlockHeightFetchTime = 0;

async function getCurrentBlockHeight(): Promise<number> {
  const now = Date.now();
  if (now - lastBlockHeightFetchTime < 30000 && cachedBlockHeight > 0) {
    return cachedBlockHeight;
  }

  try {
    const blockHeight = await connection.getBlockHeight();
    if (blockHeight !== cachedBlockHeight) {
      console.log("🔄 Block height changed. Invalidating cache...");
      apiCache.clear();
      cachedBlockHeight = blockHeight;
      lastBlockHeightFetchTime = now;
    }
    return blockHeight;
  } catch (error) {
    console.error("🚨 Error fetching block height:", error);
    throw error;
  }
}

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

export async function sendJitoBundle(
  transactions: Transaction[],
  simulate = false,
): Promise<JitoBundleResponse> {
  const method = simulate ? "simulateBundle" : "sendBundle";
  const serializedTxns = transactions.map((tx) => bs58.encode(tx.serialize()));

  const payload = {
    jsonrpc: "2.0",
    id: `jito-${Date.now()}`,
    method,
    params: simulate ? [serializedTxns] : { transactions: serializedTxns },
  };

  try {
    const response = await axios.post(QUICKNODE_RPC_URL, payload, {
      headers: { "Content-Type": "application/json" },
    });

    if (response.data?.error) {
      console.error(`❌ Jito ${method} Error:`, response.data.error);
      return { bundleId: "", status: "error" };
    }

    console.log(`✅ Jito ${method} successful:`, response.data.result);
    return { bundleId: response.data.result, status: "success" };
  } catch (error) {
    console.error(`🚨 Jito ${method} Error:`, error);
    return { bundleId: "", status: "error" };
  }
}

export async function createTestTransaction(): Promise<Transaction> {
  const transaction = new Transaction();

  transaction.add(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 10000 }),
  );

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: walletKeypair.publicKey,
      toPubkey: new PublicKey("GQHK2CneZ5g5sdhqP5qPgS9DYcF3zebJvcNt4vP9TFus"),
      lamports: 1000,
    }),
  );

  transaction.add(
    new TransactionInstruction({
      keys: [],
      programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
      data: Buffer.from("Lil Jito Bundle Test"),
    }),
  );

  // Updated to use getLatestBlockhash
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  transaction.recentBlockhash = blockhash;
  transaction.sign(walletKeypair);

  return transaction;
}

/**
 * Establishes a WebSocket connection to the Pump.fun API for real-time trade monitoring.
 * @param callback Callback function triggered when new trades or token launches are detected.
 */
export function monitorPumpFunTrades(
  callback: (tradeData: Record<string, unknown>) => void | Promise<void>,
): void {
  if (!process.env.PUMP_FUN_WEBSOCKET_URL) {
    throw new Error(
      "🚨 PUMP_FUN_WEBSOCKET_URL is not defined in the .env file.",
    );
  }

  const PUMPFUN_WS_URL = process.env.PUMP_FUN_WEBSOCKET_URL!;
  const ws = new WebSocket(PUMPFUN_WS_URL);

  ws.on("open", () => console.log("✅ Connected to Pump.fun WebSocket"));

  ws.on("message", async (data) => {
    try {
      const tradeData = JSON.parse(data.toString());
      await callback(tradeData); // Pass parsed trade data to the callback
    } catch (error) {
      console.error("🚨 Error handling trade data:", error);
    }
  });

  ws.on("error", (error) => console.error("🚨 WebSocket error:", error));

  ws.on("close", () => {
    console.warn("⚠️ WebSocket closed, reconnecting...");
    setTimeout(() => monitorPumpFunTrades(callback), 1000); // Reconnect after 1 second
  });
}

export async function getPumpFunQuote(
  mint: string,
  type: "BUY" | "SELL",
  amount: number,
  slippageBps: number = 50,
): Promise<PumpFunQuote> {
  try {
    const baseUrl = METIS_JUPITER_API_URL.replace(/\/+$/, "");
    const response = await axios.get(`${baseUrl}/pump-fun/quote`, {
      params: { mint, type, amount, slippageBps },
    });
    console.log("✅ Pump.fun quote fetched successfully:", response.data);
    return response.data as PumpFunQuote;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      console.error(
        "🚨 Axios error fetching Pump.fun quote:",
        error.response?.data || error.message,
      );
    } else if (error instanceof Error) {
      console.error("🚨 Error fetching Pump.fun quote:", error.message);
    } else {
      console.error("🚨 Unknown error fetching Pump.fun quote:", error);
    }
    throw error;
  }
}

/**
 * Prepares a Pump.fun swap transaction.
 * @param quoteResponse The response from the Pump.fun quote API.
 * @param userPublicKey The public key of the user initiating the swap.
 * @returns The base58-encoded swap transaction.
 */
export async function getPumpFunSwapTransaction(
  quoteResponse: PumpFunQuote,
  userPublicKey: string,
): Promise<string> {
  try {
    const baseUrl = METIS_JUPITER_API_URL.replace(/\/+$/, "");
    const response = await axios.post(`${baseUrl}/pump-fun/swap`, {
      quoteResponse,
      userPublicKey,
    });
    console.log("✅ Pump.fun swap transaction prepared successfully.");
    return response.data.swapTransaction;
  } catch (error) {
    console.error("🚨 Error preparing Pump.fun swap transaction:", error);
    throw error;
  }
}

export async function executePumpFunSwap(
  mint: string,
  type: "BUY" | "SELL",
  amount: number,
): Promise<string> {
  try {
    console.log("🔍 Fetching Pump.fun quote...");
    const quote: PumpFunQuote = await getPumpFunQuote(mint, type, amount); // Explicitly typed as PumpFunQuote

    console.log("🔍 Preparing Pump.fun swap transaction...");
    const swapTransaction = await getPumpFunSwapTransaction(
      quote,
      walletKeypair.publicKey.toBase58(),
    );

    console.log("📡 Executing Pump.fun swap transaction...");
    const signature = await executeSwapTransaction(swapTransaction);
    console.log(
      "✅ Pump.fun swap executed successfully. Signature:",
      signature,
    );

    return signature;
  } catch (error) {
    console.error("🚨 Error executing Pump.fun swap:", error);
    throw error;
  }
}

export async function fetchLiquidityPools(
  tokenAddress: string,
): Promise<LiquidityPool[]> {
  const cacheKey = `liquidityPools-${tokenAddress}`;
  const cached = apiCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    console.log("✅ Using cached liquidity pools data");
    return cached.data as LiquidityPool[];
  }

  try {
    const response = await axios.post(QUICKNODE_RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "qn_getTokenLiquidityPools",
      params: { tokenAddress },
    });

    if (!response.data || !response.data.result) {
      throw new Error(`Malformed response: ${JSON.stringify(response.data)}`);
    }

    apiCache.set(cacheKey, {
      data: response.data.result as LiquidityPool[],
      timestamp: Date.now(),
    });
    console.log("✅ Liquidity pools fetched successfully.");
    return response.data.result as LiquidityPool[];
  } catch (error) {
    console.error("🚨 Error fetching liquidity pools:", error);
    return [];
  }
}

if (process.env.NODE_ENV === "development") {
  (async () => {
    try {
      console.log("🚀 Testing liquidity pools fetch...");
      const tokenAddress = process.env.TEST_TOKEN_ADDRESS!;
      const pools = await fetchLiquidityPools(tokenAddress);
      console.log("✅ Liquidity pools:", pools);

      console.log("🚀 Testing Pump.fun trade...");
      const mint = process.env.TEST_TOKEN_ADDRESS!;
      const type = "BUY";
      const amount = 1000000; // Example amount in smallest units
      const signature = await executePumpFunSwap(mint, type, amount);
      console.log("✅ Pump.fun trade test successful. Signature:", signature);
    } catch (error) {
      console.error("🚨 Test failed:", error);
    }
  })();
}
