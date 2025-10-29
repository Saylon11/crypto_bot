// src/pumpBot/randomUtils.ts

/**
 * Get next trade delay using exponential distribution for more realistic timing
 * This creates natural clustering with occasional longer gaps
 */
export function getNextTradeDelay(averageDelayMs: number = 45000): number {
  // Exponential distribution for natural-looking delays
  const delay = -Math.log(1 - Math.random()) * averageDelayMs;
  
  // Add some bounds to prevent extreme values
  const minDelay = averageDelayMs * 0.1; // 10% of average
  const maxDelay = averageDelayMs * 5;    // 5x average
  
  return Math.max(minDelay, Math.min(maxDelay, delay));
}

/**
 * Get randomized buy size with realistic variance
 */
export function getBuySize(baseSol: number = 0.05): number {
  // Base amount with 40% variance
  const jitter = (Math.random() - 0.5) * 0.4;
  
  // Add random dust for unique amounts (0-0.005 SOL)
  const randomDust = Math.random() * 0.005;
  
  // Calculate final amount
  const amount = (baseSol * (1 + jitter)) + randomDust;
  
  // Ensure minimum viable amount
  return Math.max(0.01, amount);
}

/**
 * Generate a random wallet-like behavior pattern
 */
export function generateBehaviorPattern(): {
  aggressiveness: number;
  patience: number;
  riskTolerance: number;
} {
  return {
    aggressiveness: Math.random(), // 0-1, higher = more frequent trades
    patience: Math.random(),       // 0-1, higher = waits for better entries
    riskTolerance: Math.random()   // 0-1, higher = larger position sizes
  };
}

/**
 * Simulate human-like decision delay
 */
export function getHumanReactionTime(): number {
  // Human reaction time: 200-800ms base + thinking time
  const reactionTime = 200 + Math.random() * 600;
  const thinkingTime = Math.random() * 3000; // 0-3 seconds
  
  return reactionTime + thinkingTime;
}

/**
 * Generate variation in trade amounts to avoid detection
 */
export function varyAmount(baseAmount: number, variance: number = 0.2): number {
  const variation = 1 + (Math.random() - 0.5) * variance * 2;
  return baseAmount * variation;
}

/**
 * Determine if action should be taken based on probability
 */
export function shouldAct(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Get time-based activity multiplier (higher during active hours)
 */
export function getTimeBasedMultiplier(): number {
  const hour = new Date().getUTCHours();
  
  // Peak hours (14:00-22:00 UTC ~ 9am-5pm EST)
  if (hour >= 14 && hour <= 22) {
    return 1.5;
  }
  
  // Semi-active hours
  if (hour >= 10 && hour <= 23) {
    return 1.0;
  }
  
  // Low activity hours
  return 0.5;
}