// HootBot/src/utils/timing.ts

/**
 * Generate human-like delays using exponential distribution
 * This creates more realistic, non-uniform intervals
 */
export function getHumanLikeDelay(averageMs: number): number {
  // Use exponential distribution for more natural timing
  // Most delays will be shorter than average, with occasional long pauses
  const lambda = 1 / averageMs;
  const uniform = Math.random();
  
  // Exponential distribution: -ln(1-U)/λ
  const delay = -Math.log(1 - uniform) / lambda;
  
  // Cap at 3x average to prevent extreme outliers
  return Math.min(delay, averageMs * 3);
}

/**
 * Generate delays following a Poisson process
 * Better for modeling "arrival times" of human actions
 */
export function getPoissonDelay(rate: number): number {
  // rate = average events per millisecond
  const L = Math.exp(-rate);
  let k = 0;
  let p = 1;
  
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  
  return (k - 1) / rate;
}

/**
 * Add "jitter" to any timing to make it less predictable
 */
export function addJitter(baseMs: number, jitterPercent: number = 0.2): number {
  const jitter = baseMs * jitterPercent;
  return baseMs + (Math.random() * 2 - 1) * jitter;
}