import { ConsumerProfile, RegionalLiquidityReport } from "./types";
export interface MINDReport {
    survivabilityScore: number;
    consumerProfile: ConsumerProfile;
    emotionalHeatmap: string[];
    regionalFlow: RegionalLiquidityReport;
    marketFlowStrength: number;
    tradeSuggestion: {
        action: "BUY" | "SELL" | "HOLD" | "PAUSE" | "EXIT";
        percentage: number;
        reason: string;
    };
}
/**
 * Run the full HootBot MIND 1.0 cycle.
 * Fetch → Analyze → Score → Buy/Hold/Sell
 */
export declare function runMindEngine(): Promise<MINDReport>;
