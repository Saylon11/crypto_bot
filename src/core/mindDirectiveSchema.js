// /Users/owner/Desktop/HootBot/src/core/mindDirectiveSchema.js
// The Sacred Contract: How M.I.N.D. Commands HootBot

/**
 * M.I.N.D. Directive Schema v1.0
 * The inviolable contract between brain (M.I.N.D.) and body (HootBot)
 * 
 * Core Principle: M.I.N.D. decides, HootBot executes without question
 */

// ============= CORE DIRECTIVE TYPES =============

const DirectiveAction = {
  BUY: "BUY",
  SELL: "SELL", 
  WAIT: "WAIT",
  EMERGENCY_EXIT: "EMERGENCY_EXIT",
  PROFIT_TAKE: "PROFIT_TAKE"
};

const ExecutionProfile = {
  // Psychological contexts that modify execution behavior
  FOMO: "FOMO",              // Fear of missing out - rush execution
  FEAR: "FEAR",              // Market fear - cautious execution
  GREED: "GREED",            // Peak greed - aggressive sizing
  CONFIDENCE: "CONFIDENCE",   // High conviction - standard execution
  PANIC: "PANIC",            // Panic mode - immediate exit
  CAUTIOUS: "CAUTIOUS",      // Low confidence - minimal sizing
  WHALE_HUNT: "WHALE_HUNT"   // Following whale activity
};

const PriorityLevel = {
  LOW: "LOW",        // Can wait for optimal gas
  MEDIUM: "MEDIUM",  // Standard priority
  HIGH: "HIGH",      // Elevated priority fee
  CRITICAL: "CRITICAL" // Maximum priority - profit at risk
};

// ============= VALIDATION FUNCTIONS =============

function validateDirective(directive) {
  // Check required fields
  if (!directive || typeof directive !== 'object') return false;
  if (directive.version !== "1.0") return false;
  if (!directive.timestamp || !directive.sequenceId) return false;
  if (!Object.values(DirectiveAction).includes(directive.action)) return false;
  if (!Object.values(ExecutionProfile).includes(directive.executionProfile)) return false;
  if (!Object.values(PriorityLevel).includes(directive.priority)) return false;
  
  // Validate token and amount
  if (!directive.tokenMint || typeof directive.tokenMint !== 'string') return false;
  if (!directive.amount || !['PERCENTAGE', 'FIXED_SOL', 'DYNAMIC'].includes(directive.amount.type)) return false;
  if (typeof directive.amount.value !== 'number' || directive.amount.value <= 0) return false;
  
  // Validate timing
  if (!directive.timing || typeof directive.timing.executeImmediately !== 'boolean') return false;
  
  // Validate wallet strategy
  if (!directive.walletStrategy || typeof directive.walletStrategy.useRecentWallet !== 'boolean') return false;
  
  // Validate transaction params
  if (!directive.transactionParams || typeof directive.transactionParams.slippageBps !== 'number') return false;
  
  // Validate reasoning
  if (!directive.reasoning || !directive.reasoning.primaryReason) return false;
  
  return true;
}

// ============= DIRECTIVE BUILDERS =============

class DirectiveBuilder {
  static createBuyDirective(tokenMint, amount, profile, reasoning) {
    return {
      version: "1.0",
      timestamp: Date.now(),
      sequenceId: `BUY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action: DirectiveAction.BUY,
      executionProfile: profile,
      priority: profile === ExecutionProfile.FOMO ? PriorityLevel.HIGH : PriorityLevel.MEDIUM,
      tokenMint,
      amount: {
        type: "PERCENTAGE",
        value: amount,
        maxSol: 0.5
      },
      profitTargets: {
        target1: { percentage: 25, sellPercentage: 10 },
        target2: { percentage: 50, sellPercentage: 25 },
        target3: { percentage: 100, sellPercentage: 50 }
      },
      stopLoss: {
        percentage: 25,
        action: "SELL_ALL"
      },
      timing: {
        executeImmediately: profile === ExecutionProfile.FOMO || profile === ExecutionProfile.PANIC,
        maxExecutionDelay: 5000
      },
      walletStrategy: {
        useRecentWallet: profile === ExecutionProfile.FOMO,
        cooldownOverride: profile === ExecutionProfile.FOMO || profile === ExecutionProfile.PANIC
      },
      transactionParams: {
        slippageBps: profile === ExecutionProfile.FEAR ? 300 : 200,
        priorityFeeLamports: profile === ExecutionProfile.FOMO ? 50000 : undefined
      },
      reasoning: {
        primaryReason: reasoning,
        mindScore: 0, // To be filled by MIND
        riskScore: 0, // To be filled by MIND
        confidenceLevel: 0, // To be filled by MIND
        marketConditions: [],
        triggerEvents: []
      }
    };
  }
  
  static createSellDirective(tokenMint, percentage, profile, reasoning) {
    const directive = this.createBuyDirective(tokenMint, percentage, profile, reasoning);
    directive.action = DirectiveAction.SELL;
    directive.sequenceId = `SELL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    directive.priority = profile === ExecutionProfile.PANIC ? PriorityLevel.CRITICAL : PriorityLevel.HIGH;
    delete directive.profitTargets;
    delete directive.stopLoss;
    return directive;
  }
  
  static createWaitDirective(tokenMint, reasoning) {
    const directive = this.createBuyDirective(tokenMint, 0, ExecutionProfile.CAUTIOUS, reasoning);
    directive.action = DirectiveAction.WAIT;
    directive.sequenceId = `WAIT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    directive.priority = PriorityLevel.LOW;
    directive.timing.executeImmediately = false;
    delete directive.profitTargets;
    delete directive.stopLoss;
    return directive;
  }
}

// ============= EXPORTS =============

module.exports = {
  DirectiveAction,
  ExecutionProfile,
  PriorityLevel,
  validateDirective,
  DirectiveBuilder
};