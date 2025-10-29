// HootBot/src/config/tokenConfig.ts
export const FATBEAR_CONFIG = {
  // Token Details
  mint: process.env.TARGET_TOKEN_MINT,
  decimals: 6,
  
  // Supply Information (Post-Burn)
  totalSupply: 899_632_455.067375, // Current supply after burn
  burnedAmount: 100_367_544.932625, // Amount burned
  originalSupply: 1_000_000_000,    // Original supply
  
  // Holdings Calculation
  currentHoldings: 101_838_394,     // Your 113.2M tokens (11.32% of 899.6M)
  currentHoldingsPercent: 11.32,    // Percentage of current supply
  targetHoldings: 49_479_785,       // Target 5.5% of current supply
  tokensToDistribute: 52_358_609,   // Amount to distribute
  
  // Price Information
  initialPrice: 0.046,              // Starting price per token
  solPrice: 190,                    // Current SOL price in USD
};

// Update the strategic distribution bot calculations
export function calculateDistributionMetrics() {
  const { 
    currentHoldings, 
    targetHoldings, 
    tokensToDistribute,
    totalSupply 
  } = FATBEAR_CONFIG;
  
  return {
    currentPercent: (currentHoldings / totalSupply) * 100,
    targetPercent: (targetHoldings / totalSupply) * 100,
    distributionPercent: (tokensToDistribute / totalSupply) * 100,
    estimatedProfit: tokensToDistribute * FATBEAR_CONFIG.initialPrice * FATBEAR_CONFIG.solPrice
  };
}