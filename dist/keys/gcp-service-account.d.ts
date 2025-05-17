declare const fetchTrainingWallets: () => Promise<{
    wallet: string;
    token: string;
    notes: string;
}[]>;
export { fetchTrainingWallets };
