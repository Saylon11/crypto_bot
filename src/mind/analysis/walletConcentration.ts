// src/mind/analysis/walletConcentration.ts

export interface TransferConcentrationInput {
  to: string;
  amount: number;
}

/**
 * Estimates wallet concentration depth from a list of transfers.
 * It analyzes how much of the total transferred amount is held by the top N destination wallets.
 * @param transfers An array of transfer objects, each containing the destination ('to') and 'amount'.
 * @returns A number (5, 10, or 20) representing the concentration depth.
 *          5: Top 5 wallets hold > 80%
 *          10: Top 10 wallets hold > 40% (and top 5 <= 80%)
 *          20: Otherwise (including cases with no valid transfers or zero total amount)
 */
export function analyzeWalletConcentration(transfers: TransferConcentrationInput[]): number {
  const walletSums: Record<string, number> = {};

  for (const tx of transfers) {
    const toWallet = tx.to || "unknown"; // Use tx.to from TransferConcentrationInput
    const transferAmount = tx.amount;   // Use tx.amount (expected to be a number)

    // Ensure amount is a valid positive number
    if (typeof transferAmount !== 'number' || isNaN(transferAmount) || transferAmount <= 0) {
      continue;
    }

    if (!walletSums[toWallet]) {
      walletSums[toWallet] = 0;
    }
    walletSums[toWallet] += transferAmount;
  }

  const sortedHolders = Object.values(walletSums).sort((a, b) => b - a);

  if (sortedHolders.length === 0) {
    return 20; // Default if no valid transfers to analyze
  }

  const totalHeld = sortedHolders.reduce((a, b) => a + b, 0);

  if (totalHeld === 0) {
    return 20; // Default if total amount is zero
  }

  const top5 = sortedHolders.slice(0, Math.min(5, sortedHolders.length)).reduce((a, b) => a + b, 0);
  const top10 = sortedHolders.slice(0, Math.min(10, sortedHolders.length)).reduce((a, b) => a + b, 0);

  const concentration5 = (top5 / totalHeld) * 100;
  const concentration10 = (top10 / totalHeld) * 100;

  if (concentration5 > 80) return 5;
  if (concentration10 > 40) return 10;
  return 20;
}