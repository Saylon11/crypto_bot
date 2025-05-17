import { WalletData } from "../types";
export interface PanicSellReport {
    panicScore: number;
    likelyShrimpExits: number;
    totalExits: number;
    comment?: string;
}
/**
 * Detects panic sell behavior in wallets (esp. shrimp wallets) exiting at near break-even levels.
 */
export declare function detectPanicSelling(walletData: WalletData[]): PanicSellReport;
