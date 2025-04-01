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

export interface LiquidityPool {
  poolId: string;
  tokenAddress: string;
  liquidity: number;
}

export interface PumpFunQuote {
  mint: string;
  type: "BUY" | "SELL";
  amount: number;
  slippageBps: number;
  priceImpactPct?: number;
  estimatedAmount?: number;
}

export interface Config {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippage: number;
  maxTradeSize: number;
  volumeThreshold: number;
  liquidityThreshold: number;
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
}
