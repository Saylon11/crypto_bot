"use strict";
// src/modules/marketFlowAnalyzer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeMarketFlow = analyzeMarketFlow;
/**
 * Analyze meme coin liquidity movement across the market.
 * Determines if liquidity is entering (bullish) or exiting (bearish).
 */
function analyzeMarketFlow(globalLiquidityData) {
    console.log("Analyzing market flow...");
    var recentLiquidity = globalLiquidityData.slice(-10); // Take last 10 datapoints
    var previousLiquidity = globalLiquidityData.slice(-20, -10); // Take datapoints before that
    var recentAverage = recentLiquidity.length
        ? recentLiquidity.reduce(function (acc, val) { return acc + val; }, 0) / recentLiquidity.length
        : 0;
    var previousAverage = previousLiquidity.length
        ? previousLiquidity.reduce(function (acc, val) { return acc + val; }, 0) / previousLiquidity.length
        : 0;
    var inflowStrength = previousAverage === 0
        ? 50
        : Math.min(Math.max(50 + ((recentAverage - previousAverage) / previousAverage) * 50, 0), 100);
    return {
        inflowStrength: inflowStrength,
    };
}
