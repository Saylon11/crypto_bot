// src/mindEngine.ts

import dotenv from "dotenv";
dotenv.config();

import { fetchBehaviorFromHelius } from "./utils/apiClient";
import { burnWallets } from "./devTools/burnRegistry";
import { analyzeHerdSentiment } from "./modules/herdSentimentAnalyzer";
import { profileWallets } from "./modules/walletProfiler";
import { trackDevWallets } from "./modules/devWalletTracker";
import { calculateSurvivabilityScore } from "./modules/survivabilityScore";
import { analyzeMarketFlow } from "./modules/marketFlowAnalyzer";
import { mapLiquidityCycles } from "./modules/liquidityCycleMapper";
import { mapRegionalLiquidity } from "./modules/regionalLiquidityMapper";
import { analyzeConsumerProfiles } from "./modules/consumerProfileAnalyzer";
import { detectDevExhaustion } from "./modules/devExhaustionDetector";
import { devWallets } from "./data/devWalletList";
import { detectPanicSelling, PanicSellReport } from "./modules/panicSellDetector";
import { generateSnapshot } from "./modules/snapshotGenerator";

// Define all types locally to avoid import issues
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

export interface DevWallet {
  address: string;
  label: string;
  percentage?: number;
}

export interface DevExhaustionResult {
  exhausted: boolean;
  remainingPercentage: number;
  devWallets: DevWallet[];
}

export interface ConsumerProfile {
  shrimpPercent: number;
  dolphinPercent: number;
  whalePercent: number;
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
}

export interface HerdSentimentReport {
  netSentiment: number;
  buyPressure: number;
  sellPressure: number;
  dominantEmotion: 'greed' | 'fear' | 'neutral';
}

export interface WalletProfileReport {
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

export interface DevWalletRiskReport {
  riskScore: number;
  flaggedWallets: string[];
  suspiciousActivity: boolean;
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

export interface MINDReport {
  // Core metrics
  survivabilityScore: number;
  consumerProfile: ConsumerProfile;
  emotionalHeatmap: string[];
  regionalFlow: RegionalLiquidityReport;
  marketFlowStrength: number;
  
  // Trade directive
  tradeSuggestion: {
    action: "BUY" | "SELL" | "HOLD" | "PAUSE" | "EXIT";
    percentage: number;
    reason: string;
  };
  
  // Additional insights
  panicScore?: number;
  devExhaustion?: DevExhaustionResult;
  herdSentiment?: HerdSentimentReport;
  walletDistribution?: WalletProfileReport;
  peakTradingHours?: number[];
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  whaleActivity?: boolean;
  volumeTrend?: 'increasing' | 'decreasing' | 'stable';
}

function determineTradeDirective(
  survivabilityScore: number,
  panicScore: number,
  devRemaining: number,
  flowStrength: number,
  sentiment: number,
  whaleActivity: boolean = false
): { action: "BUY" | "SELL" | "HOLD" | "EXIT" | "PAUSE"; percentage: number; reason: string } {
  
  // EXIT conditions - highest priority
  if (panicScore > 60 && survivabilityScore < 40) {
    return {
      action: "EXIT",
      percentage: 100,
      reason: "CRITICAL: High panic + low survivability = EXIT NOW"
    };
  }
  
  // PAUSE conditions - wait for clarity
  if (Math.abs(flowStrength - 50) < 10 && Math.abs(sentiment) < 10) {
    return {
      action: "PAUSE",
      percentage: 0,
      reason: "Market indecision - waiting for clearer signals"
    };
  }
  
  // STRONG BUY conditions
  if (survivabilityScore > 85 && devRemaining < 10 && panicScore < 10 && flowStrength > 70) {
    return {
      action: "BUY",
      percentage: whaleActivity ? 100 : 75,
      reason: "STRONG BUY: Excellent survivability, dev exhausted, low panic" + (whaleActivity ? " + whale accumulation" : "")
    };
  }
  
  // MODERATE BUY conditions
  if (survivabilityScore > 70 && panicScore < 20 && flowStrength > 60) {
    return {
      action: "BUY",
      percentage: 50,
      reason: "Solid fundamentals with positive market flow"
    };
  }
  
  // CONSERVATIVE BUY conditions
  if (survivabilityScore > 60 && panicScore < 30 && sentiment > 20) {
    return {
      action: "BUY",
      percentage: 25,
      reason: "Moderate opportunity with manageable risk"
    };
  }
  
  // HOLD conditions
  if (survivabilityScore > 50 && panicScore < 40) {
    return {
      action: "HOLD",
      percentage: 0,
      reason: "Neutral market conditions - maintain position"
    };
  }
  
  // SELL conditions
  if (survivabilityScore < 50 || panicScore > 40 || flowStrength < 30) {
    const sellPercentage = panicScore > 50 ? 75 : 50;
    return {
      action: "SELL",
      percentage: sellPercentage,
      reason: `Risk increasing: ${panicScore > 40 ? 'panic selling detected' : 'weak fundamentals'}`
    };
  }
  
  // Default HOLD
  return {
    action: "HOLD",
    percentage: 0,
    reason: "Unclear signals - monitoring closely"
  };
}

function calculateRiskLevel(
  survivabilityScore: number,
  panicScore: number,
  devRemaining: number
): 'low' | 'medium' | 'high' | 'critical' {
  const riskScore = (100 - survivabilityScore) + panicScore + (devRemaining > 50 ? 20 : 0);
  
  if (riskScore < 50) return 'low';
  if (riskScore < 100) return 'medium';
  if (riskScore < 150) return 'high';
  return 'critical';
}

/**
 * Run the full HootBot MIND 1.0 cycle.
 * Fetch → Analyze → Score → Buy/Hold/Sell
 */
export async function runMindEngine(): Promise<MINDReport> {
  console.log("🔥 Booting HootBot MIND 1.0...");

  const walletData: WalletData[] = await fetchBehaviorFromHelius(
    process.env.HELIUS_TARGET_WALLET || process.env.DUTCHBROS_TOKEN_MINT || ""
  );

  // Tag any wallet that matches a known burner address
  walletData.forEach(wallet => {
    if (burnWallets.some(b => b.address === wallet.walletAddress)) {
      wallet.isBurner = true;
      wallet.note = "This wallet is registered as a known burn address (irreversible).";
    }
  });

  console.log("📡 Helius behavioral liquidity snapshot:", walletData);

  if (!walletData.length) {
    console.warn("⚠️ No behavioral data returned from Helius. Snapshot not generated.");
    return {
      survivabilityScore: 0,
      consumerProfile: { shrimpPercent: 0, dolphinPercent: 0, whalePercent: 0 },
      emotionalHeatmap: [],
      regionalFlow: { regionActivity: {} },
      marketFlowStrength: 0,
      tradeSuggestion: {
        action: "HOLD",
        percentage: 0,
        reason: "No data available - cannot analyze"
      },
      riskLevel: 'high'
    };
  }

  console.log("Analyzing herd sentiment...");
  const herdReport: HerdSentimentReport = analyzeHerdSentiment(walletData);
  
  console.log("Profiling wallets...");
  const walletReport: WalletProfileReport = profileWallets(walletData);
  
  console.log("Tracking dev wallet behavior...");
  const devReport: DevWalletRiskReport = trackDevWallets(devWallets as any);
  
  console.log("Analyzing consumer profiles...");
  const consumerProfile: ConsumerProfile = analyzeConsumerProfiles(walletData);
  
  console.log("Analyzing market flow...");
  const liquidityTimestamps: number[] = walletData.map(wallet => wallet.timestamp);
  const marketFlow: MarketFlowReport = analyzeMarketFlow(liquidityTimestamps);
  
  console.log("Mapping liquidity cycles...");
  const liquidityCycles: LiquidityHotZones = mapLiquidityCycles(liquidityTimestamps);
  
  console.log("Mapping regional liquidity...");
  const regionalLiquidity: RegionalLiquidityReport = mapRegionalLiquidity(liquidityTimestamps);
  
  // Detect panic selling
  const panicReport: PanicSellReport = detectPanicSelling(walletData);
  
  // Detect dev exhaustion
  const devExhaustion: DevExhaustionResult = detectDevExhaustion(devWallets as DevWallet[], walletData);
  
  // Check for whale activity
  const whaleActivity = walletReport.whales.length > 0 && 
    walletData.filter(w => walletReport.whales.includes(w.walletAddress) && w.type === 'buy').length > 
    walletData.filter(w => walletReport.whales.includes(w.walletAddress) && w.type === 'sell').length;

  console.log("Calculating survivability score...");
  const inputs: MINDInputs = {
    herdReport,
    walletReport,
    devReport,
    marketFlow,
    liquidityCycles,
    regionalLiquidity,
    consumerProfile,
  };

  const survivabilityScore: number = calculateSurvivabilityScore(inputs);

  const tradeSuggestion = determineTradeDirective(
    survivabilityScore,
    panicReport.panicScore,
    devExhaustion.remainingPercentage,
    marketFlow.inflowStrength,
    herdReport.netSentiment,
    whaleActivity
  );

  const riskLevel = calculateRiskLevel(
    survivabilityScore,
    panicReport.panicScore,
    devExhaustion.remainingPercentage
  );

  const mindReport: MINDReport = {
    survivabilityScore,
    consumerProfile,
    emotionalHeatmap: Object.keys(liquidityCycles.hourlyActivity).sort((a, b) => 
      liquidityCycles.hourlyActivity[b] - liquidityCycles.hourlyActivity[a]
    ),
    regionalFlow: regionalLiquidity,
    marketFlowStrength: marketFlow.inflowStrength,
    tradeSuggestion,
    panicScore: panicReport.panicScore,
    devExhaustion,
    herdSentiment: herdReport,
    walletDistribution: walletReport,
    peakTradingHours: liquidityCycles.peakHours || [],
    riskLevel,
    whaleActivity,
    volumeTrend: marketFlow.volumeTrend
  };

  // Generate comprehensive output
  console.log("\n\n🧠 === HootBot MIND SNAPSHOT ===");
  console.log(`🌱 Survivability Score: ${mindReport.survivabilityScore}%`);
  console.log(`🦉 Consumer Profile: 🦐 ${mindReport.consumerProfile.shrimpPercent.toFixed(1)}% Shrimp | 🐬 ${mindReport.consumerProfile.dolphinPercent.toFixed(1)}% Dolphin | 🐋 ${mindReport.consumerProfile.whalePercent.toFixed(1)}% Whale`);
  console.log(`🚀 Peak Activity Hours: ${mindReport.emotionalHeatmap.slice(0, 5).join(", ") || "No significant clustering yet"}`);
  console.log(`🌊 Regional Flow:`);

  Object.entries(mindReport.regionalFlow.regionActivity)
    .sort(([,a], [,b]) => b - a)
    .forEach(([region, percent]) => {
      console.log(`   - ${region}: ${percent}%`);
    });

  console.log(`🔥 Market Inflow Strength: ${mindReport.marketFlowStrength}%`);
  console.log(`💰 Suggested Action: ${mindReport.tradeSuggestion.action} (${mindReport.tradeSuggestion.percentage}%) - ${mindReport.tradeSuggestion.reason}`);
  console.log(`😅 Dev Exhaustion Status: ${devExhaustion.exhausted ? "🟢 Dev Exhausted" : `🔴 ${devExhaustion.remainingPercentage}% Remaining`}`);
  console.log(`📉 Panic Sell Score: ${panicReport.panicScore}%`);
  console.log(`😱 Panic Insight: ${panicReport.comment}`);
  console.log(`⚠️  Risk Level: ${riskLevel.toUpperCase()}`);
  console.log(`🐋 Whale Activity: ${whaleActivity ? "DETECTED" : "None"}`);
  console.log(`📊 Volume Trend: ${marketFlow.volumeTrend?.toUpperCase() || "UNKNOWN"}`);
  console.log("========================================\n\n");

  // Generate snapshot for historical tracking
  generateSnapshot({
    token: process.env.TOKEN_SYMBOL || "UNKNOWN",
    timestamp: Date.now(),
    whales: walletReport.whales.length,
    dolphins: walletReport.dolphins.length,
    shrimps: walletReport.shrimps.length,
    survivability: mindReport.survivabilityScore,
    panicScore: panicReport.panicScore,
    devExhaustion: Math.floor(devExhaustion.remainingPercentage),
    marketFlow: mindReport.marketFlowStrength,
    region: Object.keys(mindReport.regionalFlow.regionActivity)[0] || "Unknown",
    peakHour: mindReport.emotionalHeatmap[0] || "N/A",
    action: mindReport.tradeSuggestion.action
  });

  return mindReport;
}

// Execute the MIND engine when this file is run directly
if (require.main === module) {
  console.log("🚀 Starting HootBot MIND Engine...");
  
  runMindEngine()
    .then(report => {
      console.log("\n✅ MIND Engine Analysis Complete!");
      console.log(`Final recommendation: ${report.tradeSuggestion.action} at ${report.tradeSuggestion.percentage}%`);
      console.log(`Risk Level: ${report.riskLevel}`);
      process.exit(0);
    })
    .catch(error => {
      console.error("\n❌ MIND Engine Error:", error);
      console.error("Stack trace:", error.stack);
      process.exit(1);
    });
}