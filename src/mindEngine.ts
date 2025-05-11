// src/mindEngine.ts

import dotenv from "dotenv";
dotenv.config();

import { fetchBehaviorFromHelius } from "./utils/apiClient";
import { burnWallets } from "../devTools/burnRegistry";
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
import {
  WalletData,
  MINDInputs,
  ConsumerProfile,
  RegionalLiquidityReport,
  LiquidityHotZones,
  MarketFlowReport,
  HerdSentimentReport,
  WalletProfileReport,
  DevWalletRiskReport,
  DevWallet,
  DevExhaustionResult,
} from "./types";

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

function determineTradeDirective(
  survivabilityScore: number,
  panicScore: number,
  devRemaining: number,
  flowStrength: number,
  sentiment: number
): { action: "BUY" | "SELL" | "HOLD" | "EXIT"; percentage: number; reason: string } {
  if (survivabilityScore > 85 && devRemaining < 10 && panicScore < 10 && flowStrength > 70) {
    return {
      action: "BUY",
      percentage: 75,
      reason: "Strong survivability, low panic, and dev exhausted"
    };
  } else if (survivabilityScore > 60 && panicScore < 25) {
    return {
      action: "BUY",
      percentage: 25,
      reason: "Moderate survivability with manageable risk"
    };
  } else if (survivabilityScore > 40) {
    return {
      action: "HOLD",
      percentage: 0,
      reason: "Unclear signals – monitoring"
    };
  } else if (survivabilityScore <= 40 && panicScore > 50) {
    return {
      action: "EXIT",
      percentage: 100,
      reason: "High panic and weak survivability"
    };
  } else {
    return {
      action: "SELL",
      percentage: 50,
      reason: "Low survivability or market outflows"
    };
  }
}

/**
 * Run the full HootBot MIND 1.0 cycle.
 * Fetch → Analyze → Score → Buy/Hold/Sell
 */

export async function runMindEngine(): Promise<MINDReport> {
  console.log("🔥 Booting HootBot MIND 1.0...");

  const walletData: WalletData[] = await fetchBehaviorFromHelius(process.env.HELIUS_TARGET_WALLET || "");
  // Tag any wallet that matches a known burner address
  walletData.forEach(wallet => {
    if (burnWallets.includes(wallet.address)) {
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
        reason: "No data available"
      }
    };
  }

  const panicReport: PanicSellReport = detectPanicSelling(walletData);

  const devExhaustion: DevExhaustionResult = detectDevExhaustion(devWallets, walletData);

  const herdReport: HerdSentimentReport = analyzeHerdSentiment(walletData);
  const walletReport: WalletProfileReport = profileWallets(walletData);
  const devReport: DevWalletRiskReport = trackDevWallets([]); // Placeholder — insert real dev wallet logic later
  const consumerProfile: ConsumerProfile = analyzeConsumerProfiles(walletData);

  const liquidityTimestamps: number[] = walletData.map(wallet => wallet.timestamp);

  const marketFlow: MarketFlowReport = analyzeMarketFlow(liquidityTimestamps);
  const liquidityCycles: LiquidityHotZones = mapLiquidityCycles(liquidityTimestamps);
  const regionalLiquidity: RegionalLiquidityReport = mapRegionalLiquidity(liquidityTimestamps);

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
    herdReport.netSentiment
  );

  const mindReport: MINDReport = {
    survivabilityScore,
    consumerProfile,
    emotionalHeatmap: Object.keys(liquidityCycles.hourlyActivity),
    regionalFlow: regionalLiquidity,
    marketFlowStrength: marketFlow.inflowStrength,
    tradeSuggestion,
  };

  console.log("\n\n🧠 === HootBot MIND SNAPSHOT ===");

  console.log(`🌱 Survivability Score: ${mindReport.survivabilityScore}%`);
  console.log(`🦉 Consumer Profile: 🦐 ${mindReport.consumerProfile.shrimpPercent.toFixed(1)}% Shrimp | 🐬 ${mindReport.consumerProfile.dolphinPercent.toFixed(1)}% Dolphin | 🐋 ${mindReport.consumerProfile.whalePercent.toFixed(1)}% Whale`);
  console.log(`🚀 Peak Activity Hours: ${mindReport.emotionalHeatmap.length ? mindReport.emotionalHeatmap.join(", ") : "No significant clustering yet"}`);
  console.log(`🌊 Regional Flow:`);

  Object.entries(mindReport.regionalFlow.regionActivity).forEach(([region, percent]) => {
    console.log(`   - ${region}: ${percent}%`);
  });

  console.log(`🔥 Market Inflow Strength: ${mindReport.marketFlowStrength}%`);
  console.log(`💰 Suggested Action: ${mindReport.tradeSuggestion.action} (${mindReport.tradeSuggestion.percentage}%) - ${mindReport.tradeSuggestion.reason}`);
  console.log(`😅 Dev Exhaustion Status: ${devExhaustion.exhausted ? "🟢 Dev Exhausted" : `🔴 ${devExhaustion.remainingPercentage}% Remaining`}`);
  console.log(`📉 Panic Sell Score: ${panicReport.panicScore}%`);
  console.log(`😱 Panic Insight: ${panicReport.comment}`);
  console.log("========================================\n\n");

  generateSnapshot({
    token: "OILCOIN",
    timestamp: Date.now(),
    whales: walletReport.whales.length,
    dolphins: walletReport.dolphins.length,
    shrimps: walletReport.shrimps.length,
    survivability: mindReport.survivabilityScore,
    panicScore: panicReport.panicScore,
    devExhaustion: Math.floor(devExhaustion.remainingPercentage),
    marketFlow: mindReport.marketFlowStrength,
    region: Object.keys(mindReport.regionalFlow.regionActivity)[0] || "US",
    peakHour: mindReport.emotionalHeatmap[0] || "N/A",
    action: mindReport.tradeSuggestion.action
  });

  return mindReport;
}