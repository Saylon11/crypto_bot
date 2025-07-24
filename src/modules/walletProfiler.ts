// src/modules/walletProfiler.ts

import { WalletData, WalletProfileReport } from "../types";

/**
 * Profile wallets into Shrimp, Dolphin, Whale categories based on buy amount.
 */
export function profileWallets(wallets: WalletData[]): WalletProfileReport {
  console.log("Profiling wallets...");

  const shrimpThreshold = 500;
  const dolphinThreshold = 5000;

  const shrimps = wallets.filter(w => w.amount <= shrimpThreshold);
  const dolphins = wallets.filter(w => w.amount > shrimpThreshold && w.amount <= dolphinThreshold);
  const whales = wallets.filter(w => w.amount > dolphinThreshold);

  const total = wallets.length || 1; // Prevent divide by 0

  return {
    shrimps,
    dolphins,
    whales,
    shrimpPercent: (shrimps.length / total) * 100,
    dolphinPercent: (dolphins.length / total) * 100,
    whalePercent: (whales.length / total) * 100
  };
}