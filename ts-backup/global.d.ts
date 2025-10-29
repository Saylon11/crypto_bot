import { Transaction } from "@solana/web3.js";

// global.d.ts
export {};

interface PhantomWallet {
  isPhantom: boolean;
  connect: () => Promise<{ publicKey: string }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  // Add other known methods
}

declare global {
  interface Window {
    solana?: PhantomWallet;
  }
}
