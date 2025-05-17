import { DevWalletData, DevWalletRiskReport } from "../types";
/**
 * Track dev wallet holdings and movements to detect risk.
 */
export declare function trackDevWallets(devWallets: DevWalletData[]): DevWalletRiskReport;
