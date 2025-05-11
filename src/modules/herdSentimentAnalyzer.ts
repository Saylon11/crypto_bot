// src/modules/herdSentimentAnalyzer.ts

import { WalletData, HerdSentimentReport } from "../types"; // Adjusted path to match the correct location
import { calculateAverage, calculateStandardDeviation } from "../utils/mathUtils";
import { getUTCHourFromTimestamp } from "../utils/timeUtils";

/**
 * Analyze wallet activity to detect herd sentiment patterns.
 * Focused on small wallet clusters, emotional buying zones, and time clustering.
 */

export interface HerdSentimentReport {
  netSentiment: number;
  smallWalletBuyCount: number;
  averageBuyAmount: number;
  volatility: number;
  activeHours: string[];
}

export function analyzeHerdSentiment(wallets: WalletData[]): HerdSentimentReport {
  console.log("Analyzing herd sentiment...");

  const smallWalletThreshold = 500; // SOL or USD equivalent for "shrimp"
  
  const smallWalletBuys = wallets.filter(wallet => wallet.amount <= smallWalletThreshold);

  const buyTimestamps = smallWalletBuys.map(wallet => wallet.timestamp);
  const buyAmounts = smallWalletBuys.map(wallet => wallet.amount);

  const netBuys = wallets.filter(w => w.type === "buy").length;
  const netSells = wallets.filter(w => w.type === "sell").length;
  const netSentiment: number = Number(netBuys - netSells);

  const averageBuyAmount = buyAmounts.length ? calculateAverage(buyAmounts) : 0;
  const volatility = buyAmounts.length ? calculateStandardDeviation(buyAmounts) : 0;

  const hourlyBuckets: { [hour: string]: number } = {};

  buyTimestamps.forEach(timestamp => {
    const hour = getUTCHourFromTimestamp(timestamp);
    hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
  });

  const activeHours = Object.entries(hourlyBuckets)
    .sort((a, b) => b[1] - a[1])
    .map(([hour]) => `${hour}:00 UTC`);

  return {
    netSentiment,
    smallWalletBuyCount: smallWalletBuys.length,
    averageBuyAmount,
    volatility,
    activeHours,
  };
}