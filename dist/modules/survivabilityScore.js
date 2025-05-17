"use strict";
// src/modules/survivabilityScore.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSurvivabilityScore = calculateSurvivabilityScore;
/**
 * Aggregate all module outputs into a survivability score (0-100%).
 */
function calculateSurvivabilityScore(inputs) {
    console.log("Calculating survivability score...");
    const { herdReport, walletReport, devReport, marketFlow, liquidityCycles, regionalLiquidity, consumerProfile, } = inputs;
    // Basic weighted scoring (we can fine-tune later)
    let score = 100;
    // Penalize for emotional herding (too much shrimp activity)
    if (consumerProfile.shrimpPercent > 60) {
        score -= 20;
    }
    // Reward for dolphin or whale majority
    if (consumerProfile.dolphinPercent + consumerProfile.whalePercent > 40) {
        score += 10;
    }
    // Penalize for dev risk
    if (devReport.devRiskLevel > 20) {
        score -= 25;
    }
    // Reward for strong liquidity flow
    if (marketFlow.inflowStrength > 50) {
        score += 10;
    }
    // Cap score between 0 and 100
    score = Math.max(0, Math.min(100, score));
    return score;
}
//# sourceMappingURL=survivabilityScore.js.map