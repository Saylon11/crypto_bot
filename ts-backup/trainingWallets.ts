// src/data/trainingWallets.ts
// This file will be auto-updated from Google Sheets containing training wallets for MIND 1.0
// 'shark' represents opportunistic actors who drive prices up early or during consolidation lulls

export interface TrainingWallet {
  walletAddress: string;
  tokenMintAddress: string;
  label?: "dev" | "shrimp" | "dolphin" | "whale" | "shark"; // shark = manipulative pressure wallet
}

export const trainingWallets: TrainingWallet[] = [
  // Wallet data will be injected here automatically from Google Sheets every 2 minutes.
];