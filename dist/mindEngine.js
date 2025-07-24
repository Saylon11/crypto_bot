"use strict";
// src/mindEngine.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMindEngine = runMindEngine;
var dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
var apiClient_1 = require("./utils/apiClient");
var burnRegistry_1 = require("./devTools/burnRegistry");
var herdSentimentAnalyzer_1 = require("./modules/herdSentimentAnalyzer");
var walletProfiler_1 = require("./modules/walletProfiler");
var devWalletTracker_1 = require("./modules/devWalletTracker");
var survivabilityScore_1 = require("./modules/survivabilityScore");
var marketFlowAnalyzer_1 = require("./modules/marketFlowAnalyzer");
var liquidityCycleMapper_1 = require("./modules/liquidityCycleMapper");
var regionalLiquidityMapper_1 = require("./modules/regionalLiquidityMapper");
var consumerProfileAnalyzer_1 = require("./modules/consumerProfileAnalyzer");
var devExhaustionDetector_1 = require("./modules/devExhaustionDetector");
var devWalletList_1 = require("./data/devWalletList");
var panicSellDetector_1 = require("./modules/panicSellDetector");
var snapshotGenerator_1 = require("./modules/snapshotGenerator");
function determineTradeDirective(survivabilityScore, panicScore, devRemaining, flowStrength, sentiment, whaleActivity) {
    if (whaleActivity === void 0) { whaleActivity = false; }
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
        var sellPercentage = panicScore > 50 ? 75 : 50;
        return {
            action: "SELL",
            percentage: sellPercentage,
            reason: "Risk increasing: ".concat(panicScore > 40 ? 'panic selling detected' : 'weak fundamentals')
        };
    }
    // Default HOLD
    return {
        action: "HOLD",
        percentage: 0,
        reason: "Unclear signals - monitoring closely"
    };
}
function calculateRiskLevel(survivabilityScore, panicScore, devRemaining) {
    var riskScore = (100 - survivabilityScore) + panicScore + (devRemaining > 50 ? 20 : 0);
    if (riskScore < 50)
        return 'low';
    if (riskScore < 100)
        return 'medium';
    if (riskScore < 150)
        return 'high';
    return 'critical';
}
/**
 * Run the full HootBot MIND 1.0 cycle.
 * Fetch → Analyze → Score → Buy/Hold/Sell
 */
function runMindEngine() {
    return __awaiter(this, void 0, void 0, function () {
        var walletData, herdReport, walletReport, devReport, consumerProfile, liquidityTimestamps, marketFlow, liquidityCycles, regionalLiquidity, panicReport, devExhaustion, whaleActivity, inputs, survivabilityScore, tradeSuggestion, riskLevel, mindReport;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log("🔥 Booting HootBot MIND 1.0...");
                    return [4 /*yield*/, (0, apiClient_1.fetchBehaviorFromHelius)(process.env.HELIUS_TARGET_WALLET || process.env.DUTCHBROS_TOKEN_MINT || "")];
                case 1:
                    walletData = _b.sent();
                    // Tag any wallet that matches a known burner address
                    walletData.forEach(function (wallet) {
                        if (burnRegistry_1.burnWallets.some(function (b) { return b.address === wallet.walletAddress; })) {
                            wallet.isBurner = true;
                            wallet.note = "This wallet is registered as a known burn address (irreversible).";
                        }
                    });
                    console.log("📡 Helius behavioral liquidity snapshot:", walletData);
                    if (!walletData.length) {
                        console.warn("⚠️ No behavioral data returned from Helius. Snapshot not generated.");
                        return [2 /*return*/, {
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
                            }];
                    }
                    console.log("Analyzing herd sentiment...");
                    herdReport = (0, herdSentimentAnalyzer_1.analyzeHerdSentiment)(walletData);
                    console.log("Profiling wallets...");
                    walletReport = (0, walletProfiler_1.profileWallets)(walletData);
                    console.log("Tracking dev wallet behavior...");
                    devReport = (0, devWalletTracker_1.trackDevWallets)(devWalletList_1.devWallets);
                    console.log("Analyzing consumer profiles...");
                    consumerProfile = (0, consumerProfileAnalyzer_1.analyzeConsumerProfiles)(walletData);
                    console.log("Analyzing market flow...");
                    liquidityTimestamps = walletData.map(function (wallet) { return wallet.timestamp; });
                    marketFlow = (0, marketFlowAnalyzer_1.analyzeMarketFlow)(liquidityTimestamps);
                    console.log("Mapping liquidity cycles...");
                    liquidityCycles = (0, liquidityCycleMapper_1.mapLiquidityCycles)(liquidityTimestamps);
                    console.log("Mapping regional liquidity...");
                    regionalLiquidity = (0, regionalLiquidityMapper_1.mapRegionalLiquidity)(liquidityTimestamps);
                    panicReport = (0, panicSellDetector_1.detectPanicSelling)(walletData);
                    devExhaustion = (0, devExhaustionDetector_1.detectDevExhaustion)(devWalletList_1.devWallets, walletData);
                    whaleActivity = walletReport.whales.length > 0 &&
                        walletData.filter(function (w) { return walletReport.whales.includes(w.walletAddress) && w.type === 'buy'; }).length >
                            walletData.filter(function (w) { return walletReport.whales.includes(w.walletAddress) && w.type === 'sell'; }).length;
                    console.log("Calculating survivability score...");
                    inputs = {
                        herdReport: herdReport,
                        walletReport: walletReport,
                        devReport: devReport,
                        marketFlow: marketFlow,
                        liquidityCycles: liquidityCycles,
                        regionalLiquidity: regionalLiquidity,
                        consumerProfile: consumerProfile,
                    };
                    survivabilityScore = (0, survivabilityScore_1.calculateSurvivabilityScore)(inputs);
                    tradeSuggestion = determineTradeDirective(survivabilityScore, panicReport.panicScore, devExhaustion.remainingPercentage, marketFlow.inflowStrength, herdReport.netSentiment, whaleActivity);
                    riskLevel = calculateRiskLevel(survivabilityScore, panicReport.panicScore, devExhaustion.remainingPercentage);
                    mindReport = {
                        survivabilityScore: survivabilityScore,
                        consumerProfile: consumerProfile,
                        emotionalHeatmap: Object.keys(liquidityCycles.hourlyActivity).sort(function (a, b) {
                            return liquidityCycles.hourlyActivity[b] - liquidityCycles.hourlyActivity[a];
                        }),
                        regionalFlow: regionalLiquidity,
                        marketFlowStrength: marketFlow.inflowStrength,
                        tradeSuggestion: tradeSuggestion,
                        panicScore: panicReport.panicScore,
                        devExhaustion: devExhaustion,
                        herdSentiment: herdReport,
                        walletDistribution: walletReport,
                        peakTradingHours: liquidityCycles.peakHours || [],
                        riskLevel: riskLevel,
                        whaleActivity: whaleActivity,
                        volumeTrend: marketFlow.volumeTrend
                    };
                    // Generate comprehensive output
                    console.log("\n\n🧠 === HootBot MIND SNAPSHOT ===");
                    console.log("\uD83C\uDF31 Survivability Score: ".concat(mindReport.survivabilityScore, "%"));
                    console.log("\uD83E\uDD89 Consumer Profile: \uD83E\uDD90 ".concat(mindReport.consumerProfile.shrimpPercent.toFixed(1), "% Shrimp | \uD83D\uDC2C ").concat(mindReport.consumerProfile.dolphinPercent.toFixed(1), "% Dolphin | \uD83D\uDC0B ").concat(mindReport.consumerProfile.whalePercent.toFixed(1), "% Whale"));
                    console.log("\uD83D\uDE80 Peak Activity Hours: ".concat(mindReport.emotionalHeatmap.slice(0, 5).join(", ") || "No significant clustering yet"));
                    console.log("\uD83C\uDF0A Regional Flow:");
                    Object.entries(mindReport.regionalFlow.regionActivity)
                        .sort(function (_a, _b) {
                        var a = _a[1];
                        var b = _b[1];
                        return b - a;
                    })
                        .forEach(function (_a) {
                        var region = _a[0], percent = _a[1];
                        console.log("   - ".concat(region, ": ").concat(percent, "%"));
                    });
                    console.log("\uD83D\uDD25 Market Inflow Strength: ".concat(mindReport.marketFlowStrength, "%"));
                    console.log("\uD83D\uDCB0 Suggested Action: ".concat(mindReport.tradeSuggestion.action, " (").concat(mindReport.tradeSuggestion.percentage, "%) - ").concat(mindReport.tradeSuggestion.reason));
                    console.log("\uD83D\uDE05 Dev Exhaustion Status: ".concat(devExhaustion.exhausted ? "🟢 Dev Exhausted" : "\uD83D\uDD34 ".concat(devExhaustion.remainingPercentage, "% Remaining")));
                    console.log("\uD83D\uDCC9 Panic Sell Score: ".concat(panicReport.panicScore, "%"));
                    console.log("\uD83D\uDE31 Panic Insight: ".concat(panicReport.comment));
                    console.log("\u26A0\uFE0F  Risk Level: ".concat(riskLevel.toUpperCase()));
                    console.log("\uD83D\uDC0B Whale Activity: ".concat(whaleActivity ? "DETECTED" : "None"));
                    console.log("\uD83D\uDCCA Volume Trend: ".concat(((_a = marketFlow.volumeTrend) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || "UNKNOWN"));
                    console.log("========================================\n\n");
                    // Generate snapshot for historical tracking
                    (0, snapshotGenerator_1.generateSnapshot)({
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
                    return [2 /*return*/, mindReport];
            }
        });
    });
}
// Execute the MIND engine when this file is run directly
if (require.main === module) {
    console.log("🚀 Starting HootBot MIND Engine...");
    runMindEngine()
        .then(function (report) {
        console.log("\n✅ MIND Engine Analysis Complete!");
        console.log("Final recommendation: ".concat(report.tradeSuggestion.action, " at ").concat(report.tradeSuggestion.percentage, "%"));
        console.log("Risk Level: ".concat(report.riskLevel));
        process.exit(0);
    })
        .catch(function (error) {
        console.error("\n❌ MIND Engine Error:", error);
        console.error("Stack trace:", error.stack);
        process.exit(1);
    });
}
