// /Users/owner/Desktop/HootBot/src/core/smartTrader.js
// HootBot's Body - Executes M.I.N.D.'s Will Without Question

const { 
  DirectiveAction, 
  ExecutionProfile,
  validateDirective
} = require('./mindDirectiveSchema');
const { initiateCoordinatedBuy } = require('../trading/tradeExecutor');
const { initiateCoordinatedSell, smartProfitTake, emergencyExitPosition } = require('../trading/sellExecutor');
const { runMindEngine } = require('./mindEngine');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.scanner' });

// ============= CONFIGURATION =============

const config = {
  // Core settings
  cycleDelay: 3 * 60 * 1000, // 3 minutes
  maxDailySpend: parseFloat(process.env.MAX_DAILY_SPEND || '5'),
  
  // Wallet management
  walletPool: [], // Array of wallet addresses
  walletCooldowns: new Map(), // wallet -> last used timestamp
  
  // Human behavior simulation
  baseWaitTime: 2000, // Base milliseconds between actions
  waitTimeVariance: 50, // Variance percentage (0-100)
  
  // Session tracking
  sessionId: `SESSION-${Date.now()}`,
  startTime: Date.now()
};

// ============= SESSION STATE =============

const sessionState = {
  totalSpent: 0,
  totalEarned: 0,
  directivesReceived: 0,
  directivesExecuted: 0,
  failedExecutions: 0,
  activePositions: new Map() // tokenMint -> position data
};

// ============= HUMAN BEHAVIOR SIMULATION =============

/**
 * Generate human-like wait time using exponential distribution
 */
function generateHumanWaitTime(baseTime, variance) {
  const varianceFactor = variance / 100;
  const min = baseTime * (1 - varianceFactor);
  const max = baseTime * (1 + varianceFactor);
  
  // Use exponential distribution for more natural timing
  const lambda = 1 / baseTime;
  const exponentialDelay = -Math.log(1 - Math.random()) / lambda;
  
  // Clamp to reasonable bounds
  return Math.max(min, Math.min(max * 2, exponentialDelay));
}

/**
 * Select wallet based on execution profile and cooldowns
 */
function selectWallet(directive) {
  const now = Date.now();
  const cooldownPeriod = directive.walletStrategy.cooldownOverride ? 0 : 30 * 60 * 1000; // 30 min default
  
  // If specific wallet requested
  if (directive.walletStrategy.preferredWalletIndex !== undefined) {
    const wallet = config.walletPool[directive.walletStrategy.preferredWalletIndex];
    if (wallet && (now - (config.walletCooldowns.get(wallet) || 0)) > cooldownPeriod) {
      return wallet;
    }
  }
  
  // For FOMO profile, use recently active wallet
  if (directive.executionProfile === ExecutionProfile.FOMO && directive.walletStrategy.useRecentWallet) {
    const recentWallet = Array.from(config.walletCooldowns.entries())
      .sort((a, b) => b[1] - a[1])[0];
    if (recentWallet && (now - recentWallet[1]) < 5 * 60 * 1000) { // Used within 5 min
      return recentWallet[0];
    }
  }
  
  // Find available wallet with cooldown respected
  const availableWallets = config.walletPool.filter(wallet => {
    const lastUsed = config.walletCooldowns.get(wallet) || 0;
    return (now - lastUsed) > cooldownPeriod;
  });
  
  if (availableWallets.length === 0) return null;
  
  // Random selection from available wallets
  return availableWallets[Math.floor(Math.random() * availableWallets.length)];
}

// ============= DIRECTIVE EXECUTION =============

/**
 * Execute a directive from M.I.N.D.
 */
async function executeDirective(directive) {
  const startTime = Date.now();
  
  // Validate directive
  if (!validateDirective(directive)) {
    return {
      sequenceId: directive.sequenceId || 'UNKNOWN',
      success: false,
      executedAt: Date.now(),
      error: 'Invalid directive format'
    };
  }
  
  sessionState.directivesReceived++;
  
  try {
    // Apply human-like delay (except for emergency actions)
    if (!directive.timing.executeImmediately) {
      const waitTime = generateHumanWaitTime(config.baseWaitTime, config.waitTimeVariance);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // Select wallet
    const wallet = selectWallet(directive);
    if (!wallet) {
      throw new Error('No available wallet for execution');
    }
    
    // Execute based on action
    let result = false;
    let txHash;
    
    switch (directive.action) {
      case DirectiveAction.BUY:
        result = await executeBuy(directive, wallet);
        break;
        
      case DirectiveAction.SELL:
      case DirectiveAction.PROFIT_TAKE:
        result = await executeSell(directive, wallet);
        break;
        
      case DirectiveAction.EMERGENCY_EXIT:
        result = await executeEmergencyExit(directive, wallet);
        break;
        
      case DirectiveAction.WAIT:
        // WAIT means do nothing but log
        console.log(`⏸️  WAIT directive for ${directive.tokenMint.slice(0, 8)}...`);
        result = true;
        break;
    }
    
    // Update wallet cooldown
    config.walletCooldowns.set(wallet, Date.now());
    
    if (result) {
      sessionState.directivesExecuted++;
      
      return {
        sequenceId: directive.sequenceId,
        success: true,
        executedAt: Date.now(),
        transactionHash: txHash,
        executionDetails: {
          walletUsed: wallet,
          actualSlippage: directive.transactionParams.slippageBps / 100,
          priorityFeeUsed: directive.transactionParams.priorityFeeLamports || 5000,
          executionDelayMs: Date.now() - startTime
        }
      };
    } else {
      throw new Error('Execution failed');
    }
    
  } catch (error) {
    sessionState.failedExecutions++;
    
    return {
      sequenceId: directive.sequenceId,
      success: false,
      executedAt: Date.now(),
      error: error.message
    };
  }
}

/**
 * Execute BUY directive
 */
async function executeBuy(directive, wallet) {
  console.log(`\n💰 EXECUTING BUY DIRECTIVE`);
  console.log(`   Token: ${directive.tokenMint.slice(0, 8)}...`);
  console.log(`   Amount: ${directive.amount.value}${directive.amount.type === 'PERCENTAGE' ? '%' : ' SOL'}`);
  console.log(`   Profile: ${directive.executionProfile}`);
  console.log(`   Reason: ${directive.reasoning.primaryReason}`);
  
  // Calculate actual SOL amount
  let solAmount;
  if (directive.amount.type === 'PERCENTAGE') {
    const maxAmount = directive.amount.maxSol || 0.5;
    solAmount = (directive.amount.value / 100) * maxAmount;
  } else {
    solAmount = directive.amount.value;
  }
  
  // Check daily spend limit
  if (sessionState.totalSpent + solAmount > config.maxDailySpend) {
    console.log(`❌ Daily spend limit reached. Skipping buy.`);
    return false;
  }
  
  // Execute buy with profile-specific parameters
  const buyParams = {
    amount: solAmount,
    slippage: directive.transactionParams.slippageBps / 100,
    priorityFee: directive.transactionParams.priorityFeeLamports,
    wallet: wallet
  };
  
  const success = await initiateCoordinatedBuy(buyParams);
  
  if (success) {
    // Track position
    sessionState.activePositions.set(directive.tokenMint, {
      tokenMint: directive.tokenMint,
      buyPrice: 0, // To be filled from actual execution
      amount: solAmount,
      timestamp: Date.now(),
      profitTargets: directive.profitTargets,
      stopLoss: directive.stopLoss
    });
    
    sessionState.totalSpent += solAmount;
    console.log(`✅ Buy executed successfully!`);
  }
  
  return success;
}

/**
 * Execute SELL directive
 */
async function executeSell(directive, wallet) {
  console.log(`\n💸 EXECUTING SELL DIRECTIVE`);
  console.log(`   Token: ${directive.tokenMint.slice(0, 8)}...`);
  console.log(`   Amount: ${directive.amount.value}%`);
  console.log(`   Profile: ${directive.executionProfile}`);
  console.log(`   Reason: ${directive.reasoning.primaryReason}`);
  
  const sellParams = {
    tokenMint: directive.tokenMint,
    percentage: directive.amount.value,
    slippage: directive.transactionParams.slippageBps / 100,
    priorityFee: directive.transactionParams.priorityFeeLamports,
    wallet: wallet
  };
  
  const success = await initiateCoordinatedSell(sellParams);
  
  if (success) {
    // Update or remove position
    if (directive.amount.value >= 100) {
      sessionState.activePositions.delete(directive.tokenMint);
    }
    console.log(`✅ Sell executed successfully!`);
  }
  
  return success;
}

/**
 * Execute EMERGENCY_EXIT directive
 */
async function executeEmergencyExit(directive, wallet) {
  console.log(`\n🚨 EXECUTING EMERGENCY EXIT`);
  console.log(`   Token: ${directive.tokenMint.slice(0, 8)}...`);
  console.log(`   Reason: ${directive.reasoning.primaryReason}`);
  
  const success = await emergencyExitPosition({
    tokenMint: directive.tokenMint,
    wallet: wallet,
    maxSlippage: 10 // Accept up to 10% slippage in emergency
  });
  
  if (success) {
    sessionState.activePositions.delete(directive.tokenMint);
    console.log(`✅ Emergency exit completed!`);
  }
  
  return success;
}

// ============= MAIN LOOP =============

/**
 * Main trading loop - Receives directives from M.I.N.D. and executes
 */
async function runTradingLoop() {
  console.log(`\n🚀 HootBot Smart Trader Starting...`);
  console.log(`   Session ID: ${config.sessionId}`);
  console.log(`   Daily Limit: ${config.maxDailySpend} SOL`);
  console.log(`   Wallet Pool: ${config.walletPool.length} wallets`);
  
  while (true) {
    try {
      console.log(`\n⏰ Cycle ${sessionState.directivesReceived + 1} - Awaiting M.I.N.D. directive...`);
      
      // Get directive from M.I.N.D.
      const directive = await runMindEngine();
      
      if (directive && validateDirective(directive)) {
        // Execute the directive
        const response = await executeDirective(directive);
        
        // Log execution result
        if (response.success) {
          console.log(`✅ Directive ${response.sequenceId} executed successfully`);
        } else {
          console.log(`❌ Directive ${response.sequenceId} failed: ${response.error}`);
        }
      }
      
      // Check positions for profit targets and stop losses
      await checkPositions();
      
      // Session stats
      if (sessionState.directivesReceived % 10 === 0) {
        logSessionStats();
      }
      
      // Wait for next cycle
      await new Promise(resolve => setTimeout(resolve, config.cycleDelay));
      
    } catch (error) {
      console.error(`❌ Trading loop error:`, error);
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30s on error
    }
  }
}

/**
 * Check active positions for profit targets and stop losses
 */
async function checkPositions() {
  for (const [tokenMint, position] of sessionState.activePositions) {
    // This would check current price vs buy price
    // and trigger sells based on profit targets or stop loss
    // Implementation depends on price feed integration
  }
}

/**
 * Log session statistics
 */
function logSessionStats() {
  const runtime = (Date.now() - config.startTime) / 1000 / 60; // minutes
  
  console.log(`\n📊 SESSION STATS`);
  console.log(`   Runtime: ${runtime.toFixed(0)} minutes`);
  console.log(`   Directives Received: ${sessionState.directivesReceived}`);
  console.log(`   Directives Executed: ${sessionState.directivesExecuted}`);
  console.log(`   Failed Executions: ${sessionState.failedExecutions}`);
  console.log(`   Total Spent: ${sessionState.totalSpent.toFixed(3)} SOL`);
  console.log(`   Active Positions: ${sessionState.activePositions.size}`);
}

// ============= INITIALIZATION =============

/**
 * Initialize trader with wallet validation
 */
async function initialize() {
  // Load wallet pool from secure storage
  // This is a placeholder - implement secure wallet loading
  config.walletPool = [process.env.server.HOOTBOT_WALLET_ADDRESS || ''];
  
  // Validate all wallets before starting
  for (const wallet of config.walletPool) {
    try {
      const pubkey = new PublicKey(wallet);
      console.log(`✅ Wallet validated: ${pubkey.toString().slice(0, 8)}...`);
    } catch (error) {
      console.error(`❌ Invalid wallet: ${wallet}`);
      process.exit(1);
    }
  }
}

// ============= ENTRY POINT =============

async function main() {
  await initialize();
  await runTradingLoop();
}

// Start the trader if this is the main module
if (require.main === module) {
  main().catch(console.error);
}

// Export for testing
module.exports = {
  executeDirective,
  generateHumanWaitTime,
  selectWallet,
  sessionState,
  config
};