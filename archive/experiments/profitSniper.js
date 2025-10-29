// HootBot/src/profitSniper.js
// Profit Sniper - Intelligent Profit Taking with M.I.N.D. Integration
// Compatible with existing HootBot structure using compiled modules

const { runMindEngine } = require('./dist/mindEngine');
const { initiateCoordinatedSell, getTokenBalance, emergencyExitPosition } = require('./dist/pumpTools/sellExecutor');
const { Connection, PublicKey } = require('@solana/web3.js');

// Import randomUtils if available, otherwise provide fallbacks
let getNextTradeDelay, varyAmount;
try {
  const randomUtils = require('./dist/pumpTools/randomUtils');
  getNextTradeDelay = randomUtils.getNextTradeDelay;
  varyAmount = randomUtils.varyAmount;
} catch (error) {
  // Fallback implementations
  getNextTradeDelay = (averageDelayMs = 45000) => {
    const delay = -Math.log(1 - Math.random()) * averageDelayMs;
    const minDelay = averageDelayMs * 0.1;
    const maxDelay = averageDelayMs * 5;
    return Math.max(minDelay, Math.min(maxDelay, delay));
  };
  
  varyAmount = (baseAmount, variance = 0.2) => {
    const variation = 1 + (Math.random() - 0.5) * variance * 2;
    return baseAmount * variation;
  };
}

/**
 * Profit-taking strategies based on market psychology and M.I.N.D. analysis
 */
const PROFIT_STRATEGIES = {
  AGGRESSIVE: {
    name: "AGGRESSIVE",
    description: "Quick profits, high frequency sells",
    targets: [
      { profit: 15, sellPercent: 20, reason: "Early bird profit" },
      { profit: 30, sellPercent: 30, reason: "Momentum profit" }, 
      { profit: 50, sellPercent: 25, reason: "Half-way profit" },
      { profit: 100, sellPercent: 25, reason: "Double down secure" }
    ],
    stopLoss: 15,
    mindScoreThreshold: 60,
    panicThreshold: 60
  },
  
  CONSERVATIVE: {
    name: "CONSERVATIVE", 
    description: "Let winners run, protect capital",
    targets: [
      { profit: 25, sellPercent: 15, reason: "Quarter profit security" },
      { profit: 50, sellPercent: 20, reason: "Half profit milestone" },
      { profit: 100, sellPercent: 30, reason: "Double profit banking" },
      { profit: 200, sellPercent: 35, reason: "Triple profit victory" }
    ],
    stopLoss: 20,
    mindScoreThreshold: 70,
    panicThreshold: 50
  },
  
  WHALE: {
    name: "WHALE",
    description: "Large position management with gradual exits",
    targets: [
      { profit: 20, sellPercent: 10, reason: "Whale nibble profit" },
      { profit: 40, sellPercent: 15, reason: "Whale measured exit" },
      { profit: 75, sellPercent: 20, reason: "Whale significant profit" },
      { profit: 150, sellPercent: 25, reason: "Whale major profit" },
      { profit: 300, sellPercent: 30, reason: "Whale moonshot profit" }
    ],
    stopLoss: 12,
    mindScoreThreshold: 75,
    panicThreshold: 40
  },
  
  DIAMOND_HANDS: {
    name: "DIAMOND_HANDS",
    description: "HODL strategy with minimal profit taking",
    targets: [
      { profit: 50, sellPercent: 10, reason: "Diamond tax payment" },
      { profit: 100, sellPercent: 15, reason: "Diamond milestone" },
      { profit: 200, sellPercent: 20, reason: "Diamond partial exit" },
      { profit: 500, sellPercent: 25, reason: "Diamond moon profit" }
    ],
    stopLoss: 25,
    mindScoreThreshold: 80,
    panicThreshold: 30
  }
};

/**
 * Position tracking and profit analysis
 */
class ProfitSniper {
  constructor() {
    this.positions = new Map(); // tokenMint -> position data
    this.strategy = PROFIT_STRATEGIES.CONSERVATIVE;
    this.connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    this.sessionStats = {
      totalProfitTaken: 0,
      totalSells: 0,
      averageProfitPercent: 0,
      bestTrade: 0,
      worstTrade: 0,
      startTime: Date.now()
    };
  }

  /**
   * Set profit-taking strategy
   */
  setStrategy(strategyName) {
    const strategy = PROFIT_STRATEGIES[strategyName.toUpperCase()];
    if (!strategy) {
      console.warn(`⚠️ Unknown strategy: ${strategyName}, using CONSERVATIVE`);
      this.strategy = PROFIT_STRATEGIES.CONSERVATIVE;
      return;
    }
    
    this.strategy = strategy;
    console.log(`💎 Profit strategy set: ${strategy.name} - ${strategy.description}`);
  }

  /**
   * Track a new position for profit analysis
   */
  trackPosition(tokenMint, entryData) {
    const position = {
      tokenMint,
      symbol: entryData.symbol || 'UNKNOWN',
      entryPrice: entryData.entryPrice || 1.0,
      entrySol: entryData.entrySol || entryData.amount || 0,
      entryTime: Date.now(),
      entryMindScore: entryData.mindScore || 0,
      
      // Profit tracking
      profitTargetsHit: [],
      totalSold: 0,
      totalProfitTaken: 0,
      remainingPercent: 100,
      
      // Risk management
      stopLossHit: false,
      emergencyExitTriggered: false,
      
      // Performance
      highWaterMark: entryData.entryPrice || 1.0,
      lastAnalysisTime: 0,
      
      // Strategy
      currentStrategy: this.strategy.name
    };
    
    this.positions.set(tokenMint, position);
    console.log(`📍 Tracking position: ${position.symbol} - Entry: ${position.entrySol.toFixed(3)} SOL`);
    
    return position;
  }

  /**
   * Analyze position for profit-taking opportunities
   */
  async analyzePosition(tokenMint, currentPrice = null) {
    const position = this.positions.get(tokenMint);
    if (!position) {
      console.warn(`⚠️ Position not found: ${tokenMint}`);
      return null;
    }

    // Prevent spam analysis - minimum 30 second intervals
    const now = Date.now();
    if (now - position.lastAnalysisTime < 30000) {
      return null;
    }
    position.lastAnalysisTime = now;

    console.log(`\n🔍 Analyzing ${position.symbol} for profit opportunities...`);

    try {
      // Get current M.I.N.D. analysis for this token
      const originalToken = process.env.HELIUS_TARGET_WALLET;
      process.env.HELIUS_TARGET_WALLET = tokenMint;
      
      const mindResult = await runMindEngine();
      
      // Restore original target
      process.env.HELIUS_TARGET_WALLET = originalToken;
      
      // Calculate current profit/loss (simplified)
      const profitPercent = currentPrice ? 
        ((currentPrice - position.entryPrice) / position.entryPrice) * 100 :
        await this.estimateProfitPercent(position);
      
      // Update high water mark
      if (profitPercent > ((position.highWaterMark - position.entryPrice) / position.entryPrice) * 100) {
        position.highWaterMark = position.entryPrice * (1 + profitPercent / 100);
      }

      console.log(`   💰 Current P&L: ${profitPercent.toFixed(2)}%`);
      console.log(`   🧠 M.I.N.D. Score: ${mindResult.survivabilityScore}%`);
      console.log(`   😱 Panic Score: ${mindResult.panicScore || 0}%`);
      console.log(`   📊 Risk Level: ${mindResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
      console.log(`   🎯 Remaining Position: ${position.remainingPercent.toFixed(1)}%`);

      // Determine profit actions
      const actions = this.determineProfitActions(position, profitPercent, mindResult);
      
      // Execute profit-taking actions
      for (const action of actions) {
        await this.executeProfitAction(position, action, mindResult);
      }

      return {
        position,
        profitPercent,
        mindResult,
        actions
      };

    } catch (error) {
      console.error(`❌ Error analyzing ${position.symbol}:`, error.message);
      return null;
    }
  }

  /**
   * Determine what profit actions to take based on strategy and M.I.N.D.
   */
  determineProfitActions(position, profitPercent, mindResult) {
    const actions = [];
    const strategy = this.strategy;

    // Check for stop loss
    if (profitPercent <= -strategy.stopLoss && !position.stopLossHit) {
      actions.push({
        type: 'STOP_LOSS',
        sellPercent: 100,
        reason: `Stop loss hit at -${strategy.stopLoss}%`,
        urgency: 'HIGH'
      });
      return actions; // Stop loss overrides everything
    }

    // Check for emergency exit based on M.I.N.D. panic
    const panicScore = mindResult.panicScore || 0;
    if (panicScore >= strategy.panicThreshold && !position.emergencyExitTriggered) {
      const emergencySell = Math.min(75, position.remainingPercent);
      actions.push({
        type: 'EMERGENCY_EXIT',
        sellPercent: emergencySell,
        reason: `Panic score ${panicScore}% exceeds threshold ${strategy.panicThreshold}%`,
        urgency: 'CRITICAL'
      });
    }

    // Check for M.I.N.D. sell signals
    const mindAction = mindResult.tradeSuggestion?.action;
    if (mindAction === 'SELL' || mindAction === 'EXIT') {
      const mindSellPercent = mindResult.tradeSuggestion?.percentage || 50;
      actions.push({
        type: 'MIND_SELL',
        sellPercent: Math.min(mindSellPercent, position.remainingPercent),
        reason: `M.I.N.D. recommends ${mindAction}: ${mindResult.tradeSuggestion?.reason}`,
        urgency: 'MEDIUM'
      });
    }

    // Check for profit targets
    for (const target of strategy.targets) {
      const targetAlreadyHit = position.profitTargetsHit.includes(target.profit);
      
      if (profitPercent >= target.profit && !targetAlreadyHit) {
        const sellPercent = Math.min(target.sellPercent, position.remainingPercent);
        
        if (sellPercent > 0) {
          actions.push({
            type: 'PROFIT_TARGET',
            sellPercent: sellPercent,
            reason: target.reason,
            profitLevel: target.profit,
            urgency: 'LOW'
          });
        }
      }
    }

    // Check for M.I.N.D. score deterioration
    if (mindResult.survivabilityScore < strategy.mindScoreThreshold) {
      const deteriorationSell = Math.min(25, position.remainingPercent);
      actions.push({
        type: 'MIND_DETERIORATION',
        sellPercent: deteriorationSell,
        reason: `M.I.N.D. score dropped to ${mindResult.survivabilityScore}%`,
        urgency: 'MEDIUM'
      });
    }

    // Sort by urgency (CRITICAL > HIGH > MEDIUM > LOW)
    const urgencyOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
    actions.sort((a, b) => urgencyOrder[b.urgency] - urgencyOrder[a.urgency]);

    return actions;
  }

  /**
   * Execute a profit-taking action
   */
  async executeProfitAction(position, action, mindResult) {
    if (action.sellPercent <= 0 || position.remainingPercent <= 0) {
      return false;
    }

    console.log(`\n🎯 ${action.type}: ${position.symbol}`);
    console.log(`   Selling: ${action.sellPercent.toFixed(1)}% of remaining position`);
    console.log(`   Reason: ${action.reason}`);
    console.log(`   Urgency: ${action.urgency}`);

    try {
      // Add human-like delay based on urgency
      const urgencyDelays = { 'CRITICAL': 0, 'HIGH': 1000, 'MEDIUM': 3000, 'LOW': 5000 };
      const delay = urgencyDelays[action.urgency] + getNextTradeDelay(2000);
      
      if (delay > 0) {
        console.log(`   ⏱️ Executing in ${(delay / 1000).toFixed(1)}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Execute the sell
      let success = false;
      
      if (action.type === 'EMERGENCY_EXIT' || action.type === 'STOP_LOSS') {
        success = await emergencyExitPosition(position.tokenMint);
        if (success) {
          position.remainingPercent = 0;
          position.emergencyExitTriggered = true;
          if (action.type === 'STOP_LOSS') {
            position.stopLossHit = true;
          }
        }
      } else {
        success = await initiateCoordinatedSell(position.tokenMint, action.sellPercent);
        if (success) {
          position.remainingPercent -= action.sellPercent;
          position.totalSold += action.sellPercent;
          
          // Track profit targets hit
          if (action.type === 'PROFIT_TARGET') {
            position.profitTargetsHit.push(action.profitLevel);
          }
        }
      }

      if (success) {
        console.log(`   ✅ Sell executed successfully`);
        console.log(`   📊 Remaining position: ${position.remainingPercent.toFixed(1)}%`);
        
        // Update session stats
        this.sessionStats.totalSells++;
        this.updateSessionStats(position, action);
        
        // Remove position if completely sold
        if (position.remainingPercent <= 0) {
          console.log(`   🏁 Position fully closed: ${position.symbol}`);
          this.positions.delete(position.tokenMint);
        }
        
        return true;
      } else {
        console.log(`   ❌ Sell execution failed`);
        return false;
      }

    } catch (error) {
      console.error(`   ❌ Error executing ${action.type}:`, error.message);
      return false;
    }
  }

  /**
   * Estimate profit percentage for a position (simplified)
   */
  async estimateProfitPercent(position) {
    try {
      // This is a simplified estimation
      // In a real implementation, you'd get current market price from DEX
      const currentBalance = await getTokenBalance(
        this.connection,
        new PublicKey(process.env.HOOTBOT_WALLET_ADDRESS),
        new PublicKey(position.tokenMint)
      );
      
      // If we still have tokens, assume we're at break-even for safety
      // Real implementation would fetch current price from Jupiter/Raydium
      return currentBalance > 0 ? 0 : -100; // Conservative assumption
      
    } catch (error) {
      console.error('Error estimating profit:', error.message);
      return 0;
    }
  }

  /**
   * Update session statistics
   */
  updateSessionStats(position, action) {
    // Simplified stats update
    // Real implementation would calculate actual profit amounts
    this.sessionStats.totalProfitTaken += action.sellPercent;
  }

  /**
   * Monitor all positions for profit opportunities
   */
  async monitorAllPositions() {
    if (this.positions.size === 0) {
      return;
    }

    console.log(`\n💎 Monitoring ${this.positions.size} position(s) for profit opportunities...`);
    console.log(`📊 Strategy: ${this.strategy.name}`);

    const analysisPromises = [];
    for (const [tokenMint] of this.positions) {
      analysisPromises.push(this.analyzePosition(tokenMint));
    }

    try {
      await Promise.allSettled(analysisPromises);
    } catch (error) {
      console.error('Error in position monitoring:', error.message);
    }
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessionDuration = (Date.now() - this.sessionStats.startTime) / 1000 / 60; // minutes
    
    return {
      ...this.sessionStats,
      sessionDurationMinutes: sessionDuration.toFixed(1),
      activePositions: this.positions.size,
      currentStrategy: this.strategy.name,
      positions: Array.from(this.positions.values()).map(p => ({
        symbol: p.symbol,
        remainingPercent: p.remainingPercent.toFixed(1),
        profitTargetsHit: p.profitTargetsHit.length,
        strategy: p.currentStrategy
      }))
    };
  }

  /**
   * Emergency exit all positions
   */
  async emergencyExitAll(reason = "Manual emergency exit") {
    console.log(`\n🚨 EMERGENCY EXIT ALL POSITIONS!`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Positions to exit: ${this.positions.size}`);

    const exitPromises = [];
    for (const [tokenMint, position] of this.positions) {
      if (!position.emergencyExitTriggered) {
        console.log(`🚨 Emergency exiting ${position.symbol}...`);
        exitPromises.push(emergencyExitPosition(tokenMint));
        position.emergencyExitTriggered = true;
      }
    }

    try {
      const results = await Promise.allSettled(exitPromises);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      
      console.log(`   ✅ Successfully exited ${successful}/${this.positions.size} positions`);
      
      // Clear all positions
      this.positions.clear();
      
      return successful;
    } catch (error) {
      console.error('Error in emergency exit:', error.message);
      return 0;
    }
  }

  /**
   * Set position-specific strategy
   */
  setPositionStrategy(tokenMint, strategyName) {
    const position = this.positions.get(tokenMint);
    if (position) {
      position.currentStrategy = strategyName;
      console.log(`📝 Set ${position.symbol} strategy to ${strategyName}`);
    }
  }
}

// Export for use in other modules
module.exports = {
  ProfitSniper,
  PROFIT_STRATEGIES
};

// If run directly, start monitoring mode
if (require.main === module) {
  console.log('💎 HootBot Profit Sniper v1.0');
  console.log('==============================\n');
  
  const sniper = new ProfitSniper();
  
  // Monitor positions every 2 minutes
  setInterval(async () => {
    await sniper.monitorAllPositions();
  }, 120000);
  
  console.log('🎯 Profit monitoring active - monitoring every 2 minutes');
  console.log('Press Ctrl+C to stop\n');
}