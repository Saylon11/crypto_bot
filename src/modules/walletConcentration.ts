// src/utils/walletConcentration.ts

/**
 * Represents the data structure required for wallet concentration analysis.
 * It needs a 'toUserAccount' (destination wallet) and 'amount' for calculation.
 */
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
    // Ensure 'toUserAccount' is always a string and 'amount' is a number
    const to = tx.toUserAccount || "unknown"; // Default to "unknown" if not provided, though types should prevent this
    const amount = tx.amount; // Already a number due to TransferConcentrationInput type

    if (!walletSums[to]) {
      walletSums[to] = 0;
    }

    walletSums[to] += amount;
  }

  const sortedHolders = Object.values(walletSums).sort((a, b) => b - a);
  const totalHeld = sortedHolders.reduce((a, b) => a + b, 0);

  // Handle case where totalHeld might be zero to avoid division by zero
  if (totalHeld === 0) {
    return 0; // Or throw an error, depending on desired behavior for empty/zero transfers
  }

  const top5 = sortedHolders.slice(0, 5).reduce((a, b) => a + b, 0);
  const top10 = sortedHolders.slice(0, 10).reduce((a, b) => a + b, 0);
  const top20 = sortedHolders.slice(0, 20).reduce((a, b) => a + b, 0);

  const concentration5 = (top5 / totalHeld) * 100;
  const concentration10 = (top10 / totalHeld) * 100;
  const concentration20 = (top20 / totalHeld) * 100;

  if (concentration5 > 80) return 5;
  if (concentration10 > 40) return 10;
  return 20;
}