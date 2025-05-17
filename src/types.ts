// ==================== LEGACY TYPES (Trading, Token Analysis) ====================

export interface Quote {
  amm: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  slippageBps: number;
  priceImpactPct: string;
  platformFee: null | string;
}

export interface RoutePlan {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
}

export interface PlatformFee {
  amount: string;
  mint: string;
}

export interface QuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: "ExactIn" | "ExactOut";
  slippageBps: number;
  platformFee?: PlatformFee | null;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}


export interface Config {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippage: number;
  maxTradeSize: number;
  volumeThreshold: number;
  minimumLiquidity: number;
  priceThreshold: number;
  tokenAddress: string;
  mint: string;
  tradeType: "BUY" | "SELL";
}

export interface TradeData {
  mint: string;
  volume: number;
  price: number;
}

export interface TokenData {
  price: number;
  previousVolume: number;
  initialPrice: number;
  liquidity: number;
}

export interface JitoBundleResponse {
  bundleId: string;
  status: string;
  success?: boolean;
}

export interface CommandLineArgs {
  inputMint?: string;
  outputMint?: string;
  amount?: number;
  slippage?: number;
  test?: boolean;
  strategy?: "pumpfun" | "longterm";
}

export interface TokenReport {
  tokenAddress: string;
  riskAssessment: "low" | "medium" | "high";
  scamReports: number;
  riskScore: number;
  verified: boolean;
  details: {
    liquidity: number;
    volume: number;
  };
}

export interface NewToken {
  tokenAddress: string;
  mint: string;
  createdAt: string;
  initialLiquidity: number;
}


// --- Optional Future AI Extensions: Sentiment Analysis, Token Risk Analysis ---
export interface MarketSentiment {
  sentimentScore: number;
  trendingTopics: string[];
  recentTweets: string[];
}

export interface TokenAnalysis {
  liquidityScore: number;
  rugPullRisk: boolean;
  riskReason?: string;
}

export interface AISentimentAnalysis {
  overallScore: number;
  redditScore: number;
  telegramScore: number;
  discordScore: number;
  xComScore: number;
  detailedAnalysis: string;
}
// Strategy Evaluation Utilities
export interface TokenEvaluation {
  meetsLiquidityThreshold: boolean;
  exceedsVolumeThreshold: boolean;
  hasAcceptablePriceMovement: boolean;
  isFreshToken?: boolean;
}


// ==================== MIND 1.0 TYPES (Behavioral Intelligence) ====================

export interface WalletData {
  type: string;
  walletAddress: string;
  address: string;          // Wallet address (for burn matching and labeling)
  isBurner?: boolean;       // Flag if wallet is a known burn wallet
  note?: string;            // Optional human-readable note (e.g. reason or tag)
  tokenAddress: string;
  amount: number;
  timestamp: number;
  priceChangePercent?: number; // % change in price since entry
  totalBalance?: number;       // estimated token balance before sell
}

export interface DevWallet {
  address: string;
  initialBalance: number;
}

export interface DevExhaustionResult {
  exhausted: boolean;
  remainingPercentage: number;
}
export interface HerdSentimentReport {
  netSentiment: number;
  smallWalletBuyCount: number;
  averageBuyAmount: number;
  volatility: number;
  activeHours: string[];
}
export interface WalletProfileReport {
  shrimps: any;
  dolphins: any;
  whales: any;
  shrimpPercent: number;
  dolphinPercent: number;
  whalePercent: number;
}
export interface DevWalletData {
  walletAddress: string;
  holdingPercent: number; // Percent of total token supply
  recentMovementPercent: number; // % of their holdings moved recently
}

export interface DevWalletRiskReport {
  devRiskLevel: number; // 0–100 risk % based on how many wallets look suspicious
  riskyWalletCount: number;
  totalDevWallets: number;
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
export interface MarketFlowReport {
  inflowStrength: number; // 0-100 scale of liquidity entering
}

export interface LiquidityHotZones {
  hourlyActivity: { [hour: string]: number };
}

export interface RegionalLiquidityReport {
  regionActivity: { [region: string]: number };
}

export interface TradeDirective {
  action: "BUY" | "SELL" | "HOLD" | "EXIT";
  percentage: number;
  reason: string;
}

export interface ConsumerProfile {
  shrimpPercent: number;
  dolphinPercent: number;
  whalePercent: number;
}

export interface MINDReport {
  survivabilityScore: number;
  consumerProfile: ConsumerProfile;
  emotionalHeatmap: string[];
  regionalFlow: RegionalLiquidityReport;
  marketFlowStrength: number;
  tradeSuggestion: TradeDirective;
}
export interface TelePostPayload {
  file_url: string;
  caption: string;
  channel_id: string;
}