"use strict";
// src/mindEngine.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMindEngine = runMindEngine;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const apiClient_1 = require("./utils/apiClient");
const burnRegistry_1 = require("./devTools/burnRegistry");
const herdSentimentAnalyzer_1 = require("./modules/herdSentimentAnalyzer");
const walletProfiler_1 = require("./modules/walletProfiler");
const devWalletTracker_1 = require("./modules/devWalletTracker");
const survivabilityScore_1 = require("./modules/survivabilityScore");
const marketFlowAnalyzer_1 = require("./modules/marketFlowAnalyzer");
const liquidityCycleMapper_1 = require("./modules/liquidityCycleMapper");
const regionalLiquidityMapper_1 = require("./modules/regionalLiquidityMapper");
const consumerProfileAnalyzer_1 = require("./modules/consumerProfileAnalyzer");
const devExhaustionDetector_1 = require("./modules/devExhaustionDetector");
const devWalletList_1 = require("./data/devWalletList");
const panicSellDetector_1 = require("./modules/panicSellDetector");
const snapshotGenerator_1 = require("./modules/snapshotGenerator");
function determineTradeDirective(survivabilityScore, panicScore, devRemaining, flowStrength, sentiment) {
    if (survivabilityScore > 85 && devRemaining < 10 && panicScore < 10 && flowStrength > 70) {
        return {
            action: "BUY",
            percentage: 75,
            reason: "Strong survivability, low panic, and dev exhausted"
        };
    }
    else if (survivabilityScore > 60 && panicScore < 25) {
        return {
            action: "BUY",
            percentage: 25,
            reason: "Moderate survivability with manageable risk"
        };
    }
    else if (survivabilityScore > 40) {
        return {
            action: "HOLD",
            percentage: 0,
            reason: "Unclear signals – monitoring"
        };
    }
    else if (survivabilityScore <= 40 && panicScore > 50) {
        return {
            action: "EXIT",
            percentage: 100,
            reason: "High panic and weak survivability"
        };
    }
    else {
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
async function runMindEngine() {
    console.log("🔥 Booting HootBot MIND 1.0...");
    const walletData = await (0, apiClient_1.fetchBehaviorFromHelius)(process.env.HELIUS_TARGET_WALLET || "");
    // Tag any wallet that matches a known burner address
    walletData.forEach(wallet => {
        if (burnRegistry_1.burnWallets.some(b => b.address === wallet.address)) {
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
    const panicReport = (0, panicSellDetector_1.detectPanicSelling)(walletData);
    const devExhaustion = (0, devExhaustionDetector_1.detectDevExhaustion)(devWalletList_1.devWallets, walletData);
    const herdReport = (0, herdSentimentAnalyzer_1.analyzeHerdSentiment)(walletData);
    const walletReport = (0, walletProfiler_1.profileWallets)(walletData);
    const devReport = (0, devWalletTracker_1.trackDevWallets)([]); // Placeholder — insert real dev wallet logic later
    const consumerProfile = (0, consumerProfileAnalyzer_1.analyzeConsumerProfiles)(walletData);
    const liquidityTimestamps = walletData.map(wallet => wallet.timestamp);
    const marketFlow = (0, marketFlowAnalyzer_1.analyzeMarketFlow)(liquidityTimestamps);
    const liquidityCycles = (0, liquidityCycleMapper_1.mapLiquidityCycles)(liquidityTimestamps);
    const regionalLiquidity = (0, regionalLiquidityMapper_1.mapRegionalLiquidity)(liquidityTimestamps);
    const inputs = {
        herdReport,
        walletReport,
        devReport,
        marketFlow,
        liquidityCycles,
        regionalLiquidity,
        consumerProfile,
    };
    const survivabilityScore = (0, survivabilityScore_1.calculateSurvivabilityScore)(inputs);
    const tradeSuggestion = determineTradeDirective(survivabilityScore, panicReport.panicScore, devExhaustion.remainingPercentage, marketFlow.inflowStrength, herdReport.netSentiment);
    const mindReport = {
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
    (0, snapshotGenerator_1.generateSnapshot)({
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
//# sourceMappingURL=mindEngine.js.map