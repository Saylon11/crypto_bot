// /Users/owner/Desktop/HootBot/src/execution/smartTrader.js
// Enhanced with feedback integration - NO REFACTORING, just additions

const { runMindEngine } = require('../core/mindEngine'); // Using existing M.I.N.D. entry point
const { validateDirective } = require('../core/mindDirectiveSchema'); // Existing validators
const { recordTradeResult } = require('../ai/learning/feedback');
const { initiateCoordinatedBuy } = require('../trading/tradeExecutor');
const { initiateCoordinatedSell } = require('../trading/sellExecutor');

// Keep all existing code intact, just add this new function
async function executeTrade(tokenMint, marketSnapshot) {
  const startTime = process.hrtime.bigint();
  
  try {
    // Get directive from M.I.N.D.
    const directive = await runMindEngine(tokenMint);
    
    // Validate directive
    if (!validateDirective(directive)) {
      throw new Error('Invalid directive from M.I.N.D.');
    }
    
    // Execute based on directive action
    let response;
    switch (directive.action) {
      case 'BUY':
        response = await executeBuyDirective(directive);
        break;
      case 'SELL':
      case 'PROFIT_TAKE':
        response = await executeSellDirective(directive);
        break;
      case 'WAIT':
        response = {
          success: true,
          action: 'WAIT',
          executedAt: Date.now(),
          profitLoss: 0
        };
        break;
      default:
        throw new Error(`Unknown directive action: ${directive.action}`);
    }
    
    // Calculate latency
    const endTime = process.hrtime.bigint();
    const latencyMs = Number(endTime - startTime) / 1e6;
    
    // Add latency to response
    response.latencyMs = latencyMs;
    
    // Record feedback - the critical new addition
    await recordTradeResult({ 
      directive, 
      result: response, 
      marketSnapshot: marketSnapshot || extractMarketSnapshot(directive)
    });
    
    // Log performance
    if (latencyMs > 500) {
      console.warn(`⚠️ High latency detected: ${latencyMs.toFixed(2)}ms`);
    }
    
    return response;
    
  } catch (error) {
    console.error(`❌ Trade execution error: ${error.message}`);
    
    // Record failed trades too
    const failedResponse = {
      success: false,
      error: error.message,
      executedAt: Date.now(),
      profitLoss: 0
    };
    
    await recordTradeResult({
      directive: directive || { action: 'ERROR', tokenMint },
      result: failedResponse,
      marketSnapshot
    });
    
    throw error;
  }
}

// Helper to execute BUY directives (wraps existing logic)
async function executeBuyDirective(directive) {
  const buyParams = {
    amount: calculateSolAmount(directive),
    slippage: directive.transactionParams.slippageBps / 100,
    priorityFee: directive.transactionParams.priorityFeeLamports
  };
  
  const success = await initiateCoordinatedBuy(buyParams);
  
  return {
    success,
    action: 'BUY',
    executedAt: Date.now(),
    amount: buyParams.amount,
    profitLoss: 0 // Will be updated when position closes
  };
}

// Helper to execute SELL directives
async function executeSellDirective(directive) {
  const sellParams = {
    tokenMint: directive.tokenMint,
    percentage: directive.amount.value,
    slippage: directive.transactionParams.slippageBps / 100
  };
  
  const result = await initiateCoordinatedSell(sellParams);
  
  return {
    success: result.success,
    action: 'SELL',
    executedAt: Date.now(),
    profitLoss: result.profitLoss || 0, // Actual P/L from sell
    transactionHash: result.signature
  };
}

// Helper to calculate SOL amount from directive
function calculateSolAmount(directive) {
  if (directive.amount.type === 'PERCENTAGE') {
    const maxAmount = directive.amount.maxSol || 0.5;
    return (directive.amount.value / 100) * maxAmount;
  }
  return directive.amount.value;
}

// Extract market snapshot from directive if not provided
function extractMarketSnapshot(directive) {
  return {
    survivabilityScore: directive.reasoning.mindScore,
    panicScore: directive.reasoning.riskScore,
    confidenceLevel: directive.reasoning.confidenceLevel,
    marketConditions: directive.reasoning.marketConditions,
    timestamp: directive.timestamp
  };
}

// Export the new function alongside existing exports
module.exports = {
  executeTrade,
  // ... keep all existing exports
};