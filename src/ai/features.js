// features.js - M.I.N.D. vector for Solana predictions
function extractFeatures(mindAnalysis) {
  return [
    (mindAnalysis.survivabilityScore || 50) / 100,
    (mindAnalysis.panicScore || 50) / 100,
    (mindAnalysis.riskScore || 50) / 100,
    (mindAnalysis.confidenceLevel || 50) / 100,
    (mindAnalysis.marketFlowStrength || 50) / 100,
    (mindAnalysis.liquidityDepth || 50) / 100,
    mindAnalysis.whaleActivity ? 1 : 0,
    mindAnalysis.devExhausted ? 1 : 0,
    (mindAnalysis.fomoIndex || 50) / 100,
    mindAnalysis.volumeSpike ? 1 : 0,
    mindAnalysis.sentimentPolarity || 0.5,
    (mindAnalysis.chainCongestion || 50) / 100 // Solana tx focus
  ];
}

module.exports = { extractFeatures };
