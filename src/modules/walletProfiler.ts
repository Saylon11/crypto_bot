// src/modules/walletProfiler.ts

import { WalletData, WalletProfileReport } from "../types";

/**
 * Profile wallets into Shrimp, Dolphin, Whale categories based on buy amount.
 */

export function profileWallets(wallets: WalletData[]): WalletProfileReport {
  console.log("Profiling wallets...");

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
  shrimps: wallets.filter(w => w.amount <= shrimpThreshold),
  dolphins: wallets.filter(w => w.amount > shrimpThreshold && w.amount <= dolphinThreshold),
  whales: wallets.filter(w => w.amount > dolphinThreshold),
  shrimpPercent: 0,
  dolphinPercent: 0,
  whalePercent: 0
};
}