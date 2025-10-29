// HootBot/src/types/index.ts

/**
 * Core types for HootBot - Single source of truth
 * This file should be imported as: import { TypeName } from '../types';
 */

// Token related types
export interface TokenSnapshot {
  mint: string;
  symbol: string;
  name: string;
  price: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;
  holders: number;
  priceChange24h?: number;
  graduated: boolean;
  source: 'pumpfun' | 'raydium' | 'both';
  timestamp: number;
  
  // Optional fields
  ageHours?: number;
  score?: number;
  pairAddress?: string;
  txns24h?: number;
  volume6h?: number;
  priceChange6h?: number;
  priceChange1h?: number;
}

export interface TokenReport {
  tokenMint: string;
  name?: string;
  symbol?: string;
  price?: number;
  volume24h?: number;
  marketCap?: number;
  holders?: number;
  rugProbability?: number;
  devActivity?: number;
  liquidity?: number;
  graduated?: boolean;
}

export interface NewToken {
  mint: string;
  name?: string;
  symbol?: string;
  createdAt: number;
  creator?: string;
  initialLiquidity?: number;
}

// Trade related types
export interface TradeData {
  tokenMint: string;
  amount: number;
  side: 'buy' | 'sell';
  timestamp: number;
  signature?: string;
  wallet?: string;
}

export interface BuyResult {
  success: boolean;
  signature?: string;
  tokensReceived?: number;
  error?: string;
  wallet?: string;
  gasUsed?: number;
}

// MIND related types
export interface MINDReport {
  survivabilityScore: number;
  consumerProfile: ConsumerProfile;
  emotionalHeatmap: any[];
  regionalFlow: RegionalLiquidityReport;
  marketFlowStrength: number;
  tradeSuggestion: TradeSuggestion;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  panicScore?: number;
  whaleActivity?: boolean;
  peakTradingHours?: number[];
}

export interface TradeSuggestion {
  action: 'BUY' | 'SELL' | 'HOLD' | 'EXIT' | 'AVOID';
  percentage: number;
  reason: string;
  confidence?: number;
}

export interface ConsumerProfile {
  shrimpPercent: number;
  dolphinPercent: number;
  whalePercent: number;
}

export interface RegionalLiquidityReport {
  regionActivity: { [key: string]: number };
}

// Wallet related types
export interface WalletData {
  walletAddress: string;
  tokenAddress: string;
  amount: number;
  timestamp: number;
  priceChangePercent: number;
  totalBalance: number;
  type: 'buy' | 'sell';
  isBurner?: boolean;
  note?: string;
}

export interface DevWalletData {
  address: string;
  holdingPercent: number;
  recentMovementPercent: number;
}

export interface DevWalletRiskReport {
  devRiskLevel: number;
  riskyWalletCount: number;
  totalDevWallets: number;
}

// Scanner related types
export interface ScanFilters {
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  minLiquidity?: number;
  excludeGraduated?: boolean;
  source?: 'pumpfun' | 'raydium' | 'all';
  limit?: number;
}

export interface MarketScanResult {
  pumpTokens: TokenSnapshot[];
  raydiumTokens: TokenSnapshot[];
  allTokens: TokenSnapshot[];
  timestamp: number;
}

// Configuration types
export interface Config {
  rpcUrl: string;
  walletSecretKey: string;
  targetToken?: string;
  tradeAmount: number;
  slippage: number;
}

export interface CommandLineArgs {
  target?: string;
  amount?: number;
  mode?: string;
  inputMint?: string;
  outputMint?: string;
  slippage?: number;
  test?: boolean;
}

// Analysis types
export interface HerdSentimentReport {
  netSentiment: number;
  smallWalletBuyCount: number;
  averageBuyAmount: number;
  volatility: number;
  activeHours: string[];
}

export interface WalletProfileReport {
  whaleWallets: number;
  shrimpWallets: number;
  averageHolding: number;
}

export interface MarketFlowReport {
  inflowStrength: number;
}

export interface LiquidityHotZones {
  peakHours: number[];
  quietHours: number[];
}

// Panic detection
export interface PanicReport {
  panicScore: number;
  comment: string;
}

// Re-export commonly used types for convenience
export type WalletType = 'shrimp' | 'dolphin' | 'whale';
export type MarketAction = 'BUY' | 'SELL' | 'HOLD' | 'EXIT' | 'AVOID';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type TokenSource = 'pumpfun' | 'raydium' | 'both';