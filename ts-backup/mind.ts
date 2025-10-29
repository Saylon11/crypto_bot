// HootBot/src/types/mind.ts
/**
 * Type definitions for MIND engine reports and analysis
 */

export interface MINDReport {
  timestamp: number;
  survivabilityScore: number;
  marketFlowStrength: number;
  panicScore?: number;
  tradeSuggestion: TradeSuggestion;
  consumerProfile?: ConsumerProfile;
  devExhaustion?: DevExhaustionResult;
  whaleActivity?: boolean;
  volumeTrend?: 'increasing' | 'decreasing' | 'stable';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  herdSentiment?: HerdSentimentReport;
  walletDistribution?: WalletProfileReport;
  peakTradingHours?: number[];
  emotionalHeatmap: string[];
  regionalFlow: RegionalLiquidityReport;
}

export interface TradeSuggestion {
  action: 'BUY' | 'SELL' | 'HOLD' | 'EXIT' | 'PAUSE';
  percentage: number;
  reason: string;
}

export interface ConsumerProfile {
  shrimpPercent: number;
  dolphinPercent: number;
  whalePercent: number;
  totalHolders?: number;
}

export interface DevExhaustionResult {
  exhausted: boolean;
  remainingPercentage: number;
  burnedAmount?: number;
  originalSupply?: number;
  devWallets?: DevWallet[];
}

export interface DevWallet {
  address: string;
  label: string;
  percentage?: number;
}

export interface HerdSentimentReport {
  overall?: number;
  recentBuyers?: number;
  recentSellers?: number;
  momentum?: 'bullish' | 'bearish' | 'neutral';
  netSentiment: number;
  buyPressure: number;
  sellPressure: number;
  dominantEmotion: 'greed' | 'fear' | 'neutral';
}

export interface WalletProfileReport {
  uniqueHolders?: number;
  concentrationRisk?: number;
  distributionScore?: number;
  whales: string[];
  dolphins: string[];
  shrimps: string[];
  totalWallets: number;
  distribution: {
    whalePercentage: number;
    dolphinPercentage: number;
    shrimpPercentage: number;
  };
}

export interface RegionalLiquidityReport {
  regionActivity: Record<string, number>;
}

export interface LiquidityHotZones {
  hourlyActivity: Record<string, number>;
  peakHours: number[];
}

export interface MarketFlowReport {
  inflowStrength: number;
  netFlow: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  flowStrength?: number;
}

export interface DevWalletRiskReport {
  riskScore: number;
  flaggedWallets: string[];
  suspiciousActivity: boolean;
  devRiskLevel?: number;
}

export interface MINDInputs {
  herdReport: HerdSentimentReport;
  walletReport: WalletProfileReport;
  devReport: DevWalletRiskReport;
  marketFlow: MarketFlowReport;
  liquidityCycles: LiquidityHotZones;
  regionalLiquidity: RegionalLiquidityReport;
  consumerProfile: ConsumerProfile;
}

// Re-export MIND directive types for convenience
export { MindDirective, ExecutionProfile } from '../mind/mindCore';
