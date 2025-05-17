export interface TrainingWallet {
    walletAddress: string;
    tokenMintAddress: string;
    label?: "dev" | "shrimp" | "dolphin" | "whale" | "shark";
}
export declare const trainingWallets: TrainingWallet[];
