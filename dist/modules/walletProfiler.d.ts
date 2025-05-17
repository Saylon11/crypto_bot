import { WalletData, WalletProfileReport } from "../types";
/**
 * Profile wallets into Shrimp, Dolphin, Whale categories based on buy amount.
 */
export declare function profileWallets(wallets: WalletData[]): WalletProfileReport;
