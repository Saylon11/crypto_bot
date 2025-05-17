import { WalletData } from "../types";
/**
 * Fetch behavioral token transfer data from Helius using a known wallet address.
 */
export declare function fetchBehaviorFromHelius(walletAddress: string): Promise<WalletData[]>;
