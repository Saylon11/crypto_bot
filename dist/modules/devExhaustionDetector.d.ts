import { WalletData } from "../types";
interface DevWallet {
    address: string;
    initialBalance: number;
}
interface DevExhaustionResult {
    exhausted: boolean;
    remainingPercentage: number;
}
export declare function detectDevExhaustion(devWallets: DevWallet[], transactions: WalletData[], threshold?: number): DevExhaustionResult;
export {};
