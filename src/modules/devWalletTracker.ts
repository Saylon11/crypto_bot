// src/modules/devWalletTracker.ts

import { DevWalletData, DevWalletRiskReport } from "../types";

/**
 * Track dev wallet holdings and movements to detect risk.
 */

export function trackDevWallets(devWallets: DevWalletData[]): DevWalletRiskReport {
  console.log("Tracking dev wallet behavior...");

  const riskThresholdPercent = 5; // If devs hold more than 5% of supply, consider risky
  const suddenMovementThreshold = 20; // If dev sells/moves >20% of their tokens suddenly

  let riskyWallets = 0;
  let totalWallets = devWallets.length;

  devWallets.forEach(wallet => {
    if (wallet.holdingPercent > riskThresholdPercent || wallet.recentMovementPercent > suddenMovementThreshold) {
      riskyWallets++;
    }
  });

  const devRiskLevel = (riskyWallets / (totalWallets || 1)) * 100; // Prevent divide by 0

  return {
    devRiskLevel,
    riskyWalletCount: riskyWallets,
    totalDevWallets: totalWallets,
  };
}
// Future: Add more sophisticated tracking and alerting mechanisms