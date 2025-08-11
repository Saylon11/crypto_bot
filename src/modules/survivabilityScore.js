// src/modules/survivabilityScore.js - ENHANCED FOR EARLY EMOTION DETECTION

/**
 * Enhanced survivability score with emotional velocity and market cap scaling
 * Detects emotional liquidity BEFORE the crowd
 */
function calculateSurvivabilityScore(inputs) {
  console.log("Calculating enhanced survivability score...");

  const {
    herdReport,
    walletReport,
    devReport,
    marketFlow,
    liquidityCycles,
    regionalLiquidity,
    consumerProfile,
  } = inputs;

  // Start with neutral base (was 70, now 50 for more opportunities)
  let score = 50;

  // LOOSENED: Shrimp activity threshold (was 80%, now 60%)
  // More shrimps = emotional wave building
  if (consumerProfile.shrimpPercent > 60) {
    score -= 5; // Much lighter penalty (was -10)
  }

  // ENHANCED: Reward for ANY dolphin/whale presence (was 20%)
  if (consumerProfile.dolphinPercent + consumerProfile.whalePercent > 15) {
    score += 20; // Bigger reward (was +15)
  }

  // NEW: Fresh wallet density bonus (indicates new interest)
  const freshWalletBonus = calculateFreshWalletBonus(walletReport);
  score += freshWalletBonus;

  // NEW: Emotional velocity bonus (rate of change matters!)
  const emotionalVelocity = calculateEmotionalVelocity(inputs);
  score += emotionalVelocity;

  // LOOSENED: Dev risk threshold (was 50, now 70)
  if (devReport.devRiskLevel > 70) {
    score -= 10; // Lighter penalty (was -15)
  }

  // ENHANCED: Reward for positive flow (was 30, now 20 for earlier signals)
  if (marketFlow.inflowStrength > 20) {
    score += 25; // Bigger reward (was +20)
  }

  // ENHANCED: Strong herd sentiment bonus
  if (herdReport.netSentiment > 15) { // Was 20
    score += 15; // Was +10
  }

  // ENHANCED: Volume trend bonus
  if (marketFlow.volumeTrend === 'increasing') {
    score += 10; // Was +5
  }

  // NEW: Time-based aggression (Asia hours = lower requirements)
  const timeBonus = getTimeBasedBonus();
  score += timeBonus;

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // NEW: Market cap based floor adjustment
  const marketCapFloor = getMarketCapFloor();
  if (score < marketCapFloor && marketFlow.inflowStrength > 15) {
    score = marketCapFloor; // Ensure minimum viable score for small caps
  }

  console.log(`  Base score: ${score}%`);
  console.log(`  Fresh wallets: +${freshWalletBonus}`);
  console.log(`  Emotional velocity: +${emotionalVelocity}`);
  console.log(`  Time bonus: +${timeBonus}`);

  return score;
}

/**
 * Calculate bonus for fresh wallet activity (new participants = opportunity)
 */
function calculateFreshWalletBonus(walletReport) {
  if (!walletReport || !walletReport.totalWallets) return 0;
  
  // Assuming we track new wallets in last hour
  const newWalletRatio = (walletReport.newWallets || 0) / walletReport.totalWallets;
  
  if (newWalletRatio > 0.4) return 15; // 40%+ new wallets = strong signal
  if (newWalletRatio > 0.3) return 10; // 30%+ = good signal
  if (newWalletRatio > 0.2) return 5;  // 20%+ = decent signal
  
  return 0;
}

/**
 * Calculate emotional velocity (how fast sentiment is changing)
 */
function calculateEmotionalVelocity(inputs) {
  const { herdReport, marketFlow } = inputs;
  
  // Check if we have historical data (would need to be passed in)
  // For now, use flow strength as proxy for velocity
  let velocityScore = 0;
  
  // Strong positive sentiment shift
  if (herdReport.netSentiment > 20 && marketFlow.inflowStrength > 30) {
    velocityScore += 20; // Emotions accelerating!
  } else if (herdReport.netSentiment > 10 && marketFlow.inflowStrength > 20) {
    velocityScore += 10; // Moderate acceleration
  }
  
  // Volume surge indicates emotional shift
  if (marketFlow.volumeTrend === 'increasing') {
    velocityScore += 5;
  }
  
  return velocityScore;
}

/**
 * Time-based bonus (certain hours are more profitable)
 */
function getTimeBasedBonus() {
  const hour = new Date().getUTCHours();
  
  // Asia prime time (1:00-9:00 UTC) - stealth accumulation
  if (hour >= 1 && hour <= 9) {
    return 10; // More aggressive during Asia hours
  }
  
  // US/EU overlap (13:00-16:00 UTC) - peak volatility
  if (hour >= 13 && hour <= 16) {
    return 5; // Moderate bonus during peak hours
  }
  
  return 0;
}

/**
 * Market cap based minimum scores (smaller caps = lower requirements)
 */
function getMarketCapFloor() {
  // This would ideally check actual market cap
  // For now, return aggressive floor for all tokens
  // TODO: Pass market cap from token data
  
  const marketCap = process.env.TOKEN_MARKET_CAP || 50000; // Default to micro cap
  
  if (marketCap < 50000) return 25;    // Micro cap: 25% minimum
  if (marketCap < 500000) return 35;   // Small cap: 35% minimum
  if (marketCap < 5000000) return 45;  // Mid cap: 45% minimum
  
  return 50; // Large cap: 50% minimum
}

module.exports = { calculateSurvivabilityScore };