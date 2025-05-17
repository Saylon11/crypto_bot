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
    const recentLiquidity = globalLiquidityData.slice(-10); // Take last 10 datapoints
    const previousLiquidity = globalLiquidityData.slice(-20, -10); // Take datapoints before that
    const recentAverage = recentLiquidity.length
        ? recentLiquidity.reduce((acc, val) => acc + val, 0) / recentLiquidity.length
        : 0;
    const previousAverage = previousLiquidity.length
        ? previousLiquidity.reduce((acc, val) => acc + val, 0) / previousLiquidity.length
        : 0;
    const inflowStrength = previousAverage === 0
        ? 50
        : Math.min(Math.max(50 + ((recentAverage - previousAverage) / previousAverage) * 50, 0), 100);
    return {
        inflowStrength,
    };
}
//# sourceMappingURL=marketFlowAnalyzer.js.map