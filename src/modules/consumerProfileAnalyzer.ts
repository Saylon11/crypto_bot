// src/modules/consumerProfileAnalyzer.ts

import { WalletData, ConsumerProfile } from "../types";

/**
 * Analyze active wallets to classify consumer profiles (Shrimp, Dolphin, Whale).
 */

export function analyzeConsumerProfiles(wallets: WalletData[]): ConsumerProfile {
  console.log("Analyzing consumer profiles...");

  const shrimpThreshold = 500;
  const dolphinThreshold = 5000;

  let shrimpCount = 0;
  let dolphinCount = 0;
  let whaleCount = 0;

  wallets.forEach(wallet => {
    if (wallet.amount <= shrimpThreshold) {
      shrimpCount++;
    } else if (wallet.amount <= dolphinThreshold) {
      dolphinCount++;
    } else {
      whaleCount++;
    }
  });

  const total = shrimpCount + dolphinCount + whaleCount || 1; // Prevent divide by 0

  return {
    shrimpPercent: (shrimpCount / total) * 100,
    dolphinPercent: (dolphinCount / total) * 100,
    whalePercent: (whaleCount / total) * 100,
  };
}