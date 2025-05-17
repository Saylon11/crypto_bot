import { WalletData } from "../types";
/**
 * Analyze wallet activity to detect herd sentiment patterns.
 * Focused on small wallet clusters, emotional buying zones, and time clustering.
 */
export interface HerdSentimentReport {
    netSentiment: number;
    smallWalletBuyCount: number;
    averageBuyAmount: number;
    volatility: number;
    activeHours: string[];
}
export declare function analyzeHerdSentiment(wallets: WalletData[]): HerdSentimentReport;
