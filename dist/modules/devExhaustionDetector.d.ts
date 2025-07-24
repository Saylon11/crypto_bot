import { WalletData, DevWallet, DevExhaustionResult } from "../types";
export declare function detectDevExhaustion(devWallets: DevWallet[], transactions: WalletData[], threshold?: number): DevExhaustionResult;
