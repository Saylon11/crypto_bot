import dotenv from "dotenv";
dotenv.config();

import axios from 'axios';
import { Connection, Transaction } from '@solana/web3.js';

// Explicit URLs imported from .env
export const QUICKNODE_RPC_URL = process.env.QUICKNODE_RPC_URL!;
export const QUICKNODE_WS_URL = process.env.QUICKNODE_WS_URL!;
export const METIS_JUPITER_API_URL = process.env.METIS_JUPITER_API_URL!;

if (!QUICKNODE_RPC_URL || !METIS_JUPITER_API_URL) {
  console.error("🚨 ERROR: Missing QuickNode URLs in .env file");
  process.exit(1);
}

// Central cache setup
const apiCache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_CACHE_DURATION_MS = 30000;

function getCachedResponse(key: string, cacheDuration = DEFAULT_CACHE_DURATION_MS) {
  const cached = apiCache.get(key);
  if (cached && (Date.now() - cached.timestamp < cacheDuration)) {
    return cached.data;
  }
  return undefined;
}

function setCache(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

// Corrected Priority Fees Call using QuickNode's documented RPC method
export async function getPriorityFees(account?: string): Promise<number | undefined> {
  const cacheKey = `priorityFees:${account || "default"}`;
  const cached = getCachedResponse(cacheKey);
  if (cached) return cached;

  try {
    const params = { last_n_blocks: 100 } as any;
    if (account) params.account = account;

    const response = await axios.post(QUICKNODE_RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "qn_estimatePriorityFees",
      params,
    });

    const recommendedFee = response.data.result.recommended;
    setCache(cacheKey, recommendedFee);

    console.log("✅ Recommended Priority Fee:", recommendedFee);
    return recommendedFee;

  } catch (error) {
    console.error("🚨 Priority Fee API Error:", error);
    return undefined;
  }
}

// Centralized API call function: Liquidity pools data
export async function getLiquidityPools() {
  const cacheKey = 'allLiquidityPools';
  const cachedData = getCachedResponse(cacheKey);
  if (cachedData) {
    console.log(`✅ Using cached liquidity pools data.`);
    return cachedData;
  }

  try {
    const response = await axios.post(QUICKNODE_RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "qn_getTokenLiquidityPools",
      params: {}
    });

    if (!response.data || !response.data.result) {
      console.error("🚨 Malformed response from Liquidity Pool API", response.data);
      return [];
    }

    setCache(cacheKey, response.data.result);
    console.log(`✅ Retrieved liquidity pools data from QuickNode.`);
    return response.data.result;

  } catch (error) {
    console.error("🚨 Liquidity Pool API Error:", error);
    return [];
  }
}

// Execute Swap function explicitly structured for QuickNode Jupiter Swap API
export async function executeSwap(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippage: number,
  priorityFee: number,
  userPublicKey: string
) {
  try {
    const swapPayload = {
      inputMint,
      outputMint,
      amount,
      slippageBps: slippage * 100, // converting slippage percentage to BPS
      userPublicKey,
      priorityFee
    };

    const response = await axios.post(`${METIS_JUPITER_API_URL}/swap`, swapPayload, {
      headers: { "Content-Type": "application/json" }
    });

    console.log("✅ Swap executed successfully:", response.data);
    return response.data;

  } catch (error) {
    console.error("🚨 Swap execution error:", error);
    throw error;
  }
}

// Submit JITO bundle transaction
export async function submitJitoBundle(transactions: Transaction[]) {
  const connection = new Connection(QUICKNODE_RPC_URL, { commitment: 'confirmed' });

  try {
    const serializedTransactions = transactions.map(tx => tx.serialize().toString('base64'));

    const payload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sendBundle',
      params: { transactions: serializedTransactions },
    };

    const response = await axios.post(QUICKNODE_RPC_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data.error) {
      console.error('🚨 JITO Bundle Submission Error:', response.data.error);
      throw new Error(response.data.error.message);
    }

    console.log('✅ JITO Bundle Submitted:', response.data.result);
    return response.data.result;

  } catch (error) {
    console.error('🚨 JITO API Error:', error);
    throw error;
  }
}
