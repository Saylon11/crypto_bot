// src/modules/walletConcentration.ts

export interface TransferConcentrationInput {
  toUserAccount: string;
  amount: number;
}

/**
 * Estimate wallet concentration depth from Helius transfers.
 * Returns a number indicating the concentration target (e.g., 5, 10, or 20 for top 5%, 10%, 20%).
 */
export function analyzeWalletConcentration(transfers: TransferConcentrationInput[]): number {
  const walletSums: Record<string, number> = {};

  for (const tx of transfers) {
    const to = tx.toUserAccount || "unknown";
    const amount = tx.amount;

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      continue;
    }

    if (!walletSums[to]) {
      walletSums[to] = 0;
    }
    walletSums[to] += amount;
  }

  const sortedHolders = Object.values(walletSums).sort((a, b) => b - a);

  if (sortedHolders.length === 0) {
    return 20;
  }

  const totalHeld = sortedHolders.reduce((a, b) => a + b, 0);

  if (totalHeld === 0) {
    return 20;
  }

  const top5 = sortedHolders.slice(0, Math.min(5, sortedHolders.length)).reduce((a, b) => a + b, 0);
  const top10 = sortedHolders.slice(0, Math.min(10, sortedHolders.length)).reduce((a, b) => a + b, 0);
  const top20 = sortedHolders.slice(0, Math.min(20, sortedHolders.length)).reduce((a, b) => a + b, 0);

  const concentration5 = (top5 / totalHeld) * 100;
  const concentration10 = (top10 / totalHeld) * 100;
  const concentration20 = (top20 / totalHeld) * 100;

  if (concentration5 > 80) return 5;
  if (concentration10 > 40) return 10;
  return 20;
}