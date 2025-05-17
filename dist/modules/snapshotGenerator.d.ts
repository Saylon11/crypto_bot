interface SnapshotInput {
    token: string;
    timestamp: number;
    whales: number;
    dolphins: number;
    shrimps: number;
    survivability: number;
    panicScore: number;
    devExhaustion: number;
    marketFlow: number;
    region: string;
    peakHour: string;
    action: string;
}
export declare function generateSnapshot(input: SnapshotInput): void;
export {};
