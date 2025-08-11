// /Users/owner/Desktop/HootBot/src/core/mindEngine.ts
// M.I.N.D. - The Sovereign Brain That Commands HootBot

import { 
  MINDDirective, 
  DirectiveAction, 
  ExecutionProfile,
  PriorityLevel,
  DirectiveBuilder 
} from './mindDirectiveSchema';

// Import analysis modules
import { detectPanic } from '../analysis/panicDetector';
import { analyzeDevWallets } from '../analysis/devWalletTracker';
import { analyzeLiquidity } from '../analysis/liquidityMapper';
import { profileConsumers } from '../analysis/consumerProfiler';
import { detectEmotions } from '../analysis/emotionalRadar';
import { analyzeHerdBehavior } from '../analysis/herdTracker';
import { monitorNetworkCongestion } from '../analysis/networkMonitor';
import { analyzeRegionalActivity } from '../analysis/regionalHeatmap';
import { assessExhaustionLevel } from '../analysis/devExhaustion';
import { analyzeMarketFlow } from '../analysis/flowAnalyzer';

// ============= MIND CONFIGURATION =============

interface MINDConfig {
  // Thresholds for decision making
  minSurvivabilityToBuy: number;
  minConfidenceToTrade: number;
  panicSellThreshold: number;
  
  // Profit targets
  profitTargets: {
    conservative: { t1: 15, t2: 30, t3: 50 };
    moderate: { t1: 25, t2: 50, t3: 100 };
    aggressive: { t1: 50, t2: 100, t3: 200 };
  };
  
  // Risk levels
  maxRiskScore: number;
  criticalPanicLevel: number;
  
  // Token to analyze (set dynamically)
  targetToken?: string;
}

const config: MINDConfig = {
  minSurvivabilityToBuy: 60,
  minConfidenceToTrade: 50,
  panicSellThreshold: 70,
  profitTargets: {
    conservative: { t1: 15, t2: 30, t3: 50 },
    moderate: { t1: 25, t2: 50, t3: 100 },
    aggressive: { t1: 50, t2: 100, t3: 200 }
  },
  maxRiskScore: 80,
  criticalPanicLevel: 85,
  targetToken: process.env.DUTCHBROS_TOKEN_MINT
};

// ============= CORE ANALYSIS =============

interface MINDAnalysis {
  // Core scores
  survivabilityScore: number;
  confidenceLevel: number;
  riskScore: number;
  panicScore: number;
  
  // Market dynamics
  marketFlowStrength: number;
  volumeTrend: 'increasing' | 'decreasing' | 'stable';
  liquidityDepth: number;
  
  // Behavioral analysis
  dominantEmotion: 'greed' | 'fear' | 'neutral';
  herdDirection: 'buying' | 'selling' | 'mixed';
  whaleActivity: boolean;
  
  // Developer analysis
  devExhausted: boolean;
  devRemainingPercentage: number;
  rugPullRisk: number;
  
  // Consumer metrics
  consumerProfile: {
    shrimpPercent: number;
    dolphinPercent: number;
    whalePercent: number;
  };
  
  // Timing
  peakTradingHours: number[];
  currentHourActivity: 'high' | 'medium' | 'low';
}

/**
 * Run comprehensive M.I.N.D. analysis
 */
async function runAnalysis(tokenMint: string): Promise<MINDAnalysis> {
  console.log(`\n🧠 M.I.N.D. analyzing ${tokenMint.slice(0, 8)}...`);
  
  // Run all analysis modules in parallel
  const [
    panicReport,
    devReport,
    liquidityReport,
    consumerReport,
    emotionReport,
    herdReport,
    networkReport,
    regionalReport,
    exhaustionReport,
    flowReport
  ] = await Promise.all([
    detectPanic(tokenMint),
    analyzeDevWallets(tokenMint),
    analyzeLiquidity(tokenMint),
    profileConsumers(tokenMint),
    detectEmotions(tokenMint),
    analyzeHerdBehavior(tokenMint),
    monitorNetworkCongestion(),
    analyzeRegionalActivity(tokenMint),
    assessExhaustionLevel(tokenMint),
    analyzeMarketFlow(tokenMint)
  ]);
  
  // Calculate survivability score
  const survivabilityScore = calculateSurvivability({
    panicScore: panicReport.score,
    devRisk: devReport.riskScore,
    liquidityDepth: liquidityReport.depth,
    consumerHealth: (consumerReport.shrimpPercent > 60) ? 80 : 60,
    marketFlow: flowReport.inflowStrength,
    devExhaustion: exhaustionReport.exhausted ? 90 : exhaustionReport.remainingPercentage
  });
  
  // Determine dominant emotion
  const dominantEmotion = emotionReport.greed > emotionReport.fear ? 'greed' : 
                         emotionReport.fear > emotionReport.greed ? 'fear' : 'neutral';
  
  // Build analysis result
  return {
    survivabilityScore,
    confidenceLevel: calculateConfidence(survivabilityScore, panicReport.score),
    riskScore: calculateRiskScore(devReport.riskScore, panicReport.score, liquidityReport.depth),
    panicScore: panicReport.score,
    
    marketFlowStrength: flowReport.inflowStrength,
    volumeTrend: flowReport.volumeTrend,
    liquidityDepth: liquidityReport.depth,
    
    dominantEmotion,
    herdDirection: herdReport.netSentiment > 0.2 ? 'buying' : 
                   herdReport.netSentiment < -0.2 ? 'selling' : 'mixed',
    whaleActivity: herdReport.whaleActivity,
    
    devExhausted: exhaustionReport.exhausted,
    devRemainingPercentage: exhaustionReport.remainingPercentage,
    rugPullRisk: devReport.riskScore,
    
    consumerProfile: consumerReport,
    
    peakTradingHours: liquidityReport.peakHours || [],
    currentHourActivity: determineHourActivity(liquidityReport.hourlyActivity)
  };
}

// ============= DECISION ENGINE =============

/**
 * Generate trading directive based on analysis
 */
function generateDirective(analysis: MINDAnalysis, tokenMint: string): MINDDirective {
  // Determine action
  const action = determineAction(analysis);
  
  // Determine execution profile
  const profile = determineExecutionProfile(analysis);
  
  // Determine position size
  const positionSize = calculatePositionSize(analysis, profile);
  
  // Get profit targets based on profile
  const profitTargets = getProfitTargets(profile);
  
  // Build reasoning
  const reasoning = buildReasoning(analysis, action);
  
  // Create directive using builder
  switch (action) {
    case DirectiveAction.BUY:
      const buyDirective = DirectiveBuilder.createBuyDirective(
        tokenMint,
        positionSize,
        profile,
        reasoning
      );
      
      // Enhance with analysis data
      buyDirective.reasoning.mindScore = analysis.survivabilityScore;
      buyDirective.reasoning.riskScore = analysis.riskScore;
      buyDirective.reasoning.confidenceLevel = analysis.confidenceLevel;
      buyDirective.reasoning.marketConditions = getMarketConditions(analysis);
      buyDirective.reasoning.triggerEvents = getTriggerEvents(analysis);
      buyDirective.profitTargets = profitTargets;
      
      return buyDirective;
      
    case DirectiveAction.SELL:
      const sellPercentage = calculateSellPercentage(analysis);
      const sellDirective = DirectiveBuilder.createSellDirective(
        tokenMint,
        sellPercentage,
        profile,
        reasoning
      );
      
      sellDirective.reasoning.mindScore = analysis.survivabilityScore;
      sellDirective.reasoning.riskScore = analysis.riskScore;
      sellDirective.reasoning.confidenceLevel = analysis.confidenceLevel;
      
      return sellDirective;
      
    case DirectiveAction.EMERGENCY_EXIT:
      const exitDirective = DirectiveBuilder.createSellDirective(
        tokenMint,
        100, // Exit full position
        ExecutionProfile.PANIC,
        reasoning
      );
      
      exitDirective.action = DirectiveAction.EMERGENCY_EXIT;
      exitDirective.priority = PriorityLevel.CRITICAL;
      
      return exitDirective;
      
    default: // WAIT
      return DirectiveBuilder.createWaitDirective(tokenMint, reasoning);
  }
}

// ============= DECISION HELPERS =============

function determineAction(analysis: MINDAnalysis): DirectiveAction {
  // Emergency conditions
  if (analysis.panicScore >= config.criticalPanicLevel) {
    return DirectiveAction.EMERGENCY_EXIT;
  }
  
  if (analysis.rugPullRisk > 80 && !analysis.devExhausted) {
    return DirectiveAction.EMERGENCY_EXIT;
  }
  
  // Sell conditions
  if (analysis.panicScore >= config.panicSellThreshold) {
    return DirectiveAction.SELL;
  }
  
  if (analysis.survivabilityScore < 40 && analysis.dominantEmotion === 'fear') {
    return DirectiveAction.SELL;
  }
  
  if (analysis.herdDirection === 'selling' && analysis.whaleActivity) {
    return DirectiveAction.SELL;
  }
  
  // Buy conditions
  if (analysis.survivabilityScore >= config.minSurvivabilityToBuy && 
      analysis.confidenceLevel >= config.minConfidenceToTrade) {
    
    // Additional buy filters
    if (analysis.devExhausted && analysis.marketFlowStrength > 60) {
      return DirectiveAction.BUY;
    }
    
    if (analysis.dominantEmotion === 'greed' && analysis.volumeTrend === 'increasing') {
      return DirectiveAction.BUY;
    }
    
    if (analysis.consumerProfile.shrimpPercent > 70 && analysis.liquidityDepth > 50) {
      return DirectiveAction.BUY;
    }
  }
  
  // Default to wait
  return DirectiveAction.WAIT;
}

function determineExecutionProfile(analysis: MINDAnalysis): ExecutionProfile {
  // Panic conditions
  if (analysis.panicScore > 80 || analysis.rugPullRisk > 80) {
    return ExecutionProfile.PANIC;
  }
  
  // FOMO conditions
  if (analysis.dominantEmotion === 'greed' && 
      analysis.volumeTrend === 'increasing' && 
      analysis.herdDirection === 'buying') {
    return ExecutionProfile.FOMO;
  }
  
  // Fear conditions
  if (analysis.dominantEmotion === 'fear' || analysis.panicScore > 60) {
    return ExecutionProfile.FEAR;
  }
  
  // Whale hunting
  if (analysis.whaleActivity && analysis.herdDirection === 'buying') {
    return ExecutionProfile.WHALE_HUNT;
  }
  
  // Confidence-based
  if (analysis.confidenceLevel > 80) {
    return ExecutionProfile.CONFIDENCE;
  }
  
  if (analysis.confidenceLevel < 50) {
    return ExecutionProfile.CAUTIOUS;
  }
  
  return ExecutionProfile.CONFIDENCE;
}

function calculatePositionSize(analysis: MINDAnalysis, profile: ExecutionProfile): number {
  let baseSize = 25; // Base 25% position
  
  // Adjust based on confidence
  if (analysis.confidenceLevel > 80) {
    baseSize += 15;
  } else if (analysis.confidenceLevel < 50) {
    baseSize -= 10;
  }
  
  // Adjust based on profile
  switch (profile) {
    case ExecutionProfile.FOMO:
      baseSize += 20;
      break;
    case ExecutionProfile.WHALE_HUNT:
      baseSize += 25;
      break;
    case ExecutionProfile.CAUTIOUS:
      baseSize = Math.min(baseSize, 15);
      break;
    case ExecutionProfile.PANIC:
      baseSize = 100; // Exit full position
      break;
  }
  
  // Adjust based on dev exhaustion
  if (analysis.devExhausted) {
    baseSize += 10;
  }
  
  // Cap at 100%
  return Math.min(100, Math.max(5, baseSize));
}

function calculateSellPercentage(analysis: MINDAnalysis): number {
  if (analysis.panicScore > 85) return 100;
  if (analysis.panicScore > 70) return 75;
  if (analysis.dominantEmotion === 'fear' && analysis.herdDirection === 'selling') return 50;
  return 25; // Default partial sell
}

// ============= UTILITY FUNCTIONS =============

function calculateSurvivability(factors: any): number {
  const weights = {
    panicScore: -0.3,
    devRisk: -0.2,
    liquidityDepth: 0.2,
    consumerHealth: 0.15,
    marketFlow: 0.1,
    devExhaustion: 0.05
  };
  
  let score = 100;
  score += factors.panicScore * weights.panicScore;
  score += factors.devRisk * weights.devRisk;
  score += factors.liquidityDepth * weights.liquidityDepth;
  score += factors.consumerHealth * weights.consumerHealth;
  score += factors.marketFlow * weights.marketFlow;
  score += factors.devExhaustion * weights.devExhaustion;
  
  return Math.max(0, Math.min(100, score));
}

function calculateConfidence(survivability: number, panicScore: number): number {
  const base = survivability;
  const panicPenalty = panicScore * 0.5;
  return Math.max(0, Math.min(100, base - panicPenalty));
}

function calculateRiskScore(devRisk: number, panicScore: number, liquidityDepth: number): number {
  const liquidityBonus = liquidityDepth * 0.2;
  return Math.max(0, Math.min(100, (devRisk + panicScore) / 2 - liquidityBonus));
}

function getProfitTargets(profile: ExecutionProfile): MINDDirective['profitTargets'] {
  switch (profile) {
    case ExecutionProfile.FOMO:
    case ExecutionProfile.WHALE_HUNT:
      return {
        target1: { percentage: 50, sellPercentage: 20 },
        target2: { percentage: 100, sellPercentage: 30 },
        target3: { percentage: 200, sellPercentage: 50 }
      };
      
    case ExecutionProfile.CAUTIOUS:
    case ExecutionProfile.FEAR:
      return {
        target1: { percentage: 15, sellPercentage: 30 },
        target2: { percentage: 30, sellPercentage: 40 },
        target3: { percentage: 50, sellPercentage: 30 }
      };
      
    default:
      return {
        target1: { percentage: 25, sellPercentage: 10 },
        target2: { percentage: 50, sellPercentage: 25 },
        target3: { percentage: 100, sellPercentage: 50 }
      };
  }
}

function buildReasoning(analysis: MINDAnalysis, action: DirectiveAction): string {
  const conditions: string[] = [];
  
  if (analysis.survivabilityScore > 70) {
    conditions.push('high survivability');
  }
  
  if (analysis.devExhausted) {
    conditions.push('developer exhausted');
  }
  
  if (analysis.whaleActivity) {
    conditions.push('whale activity detected');
  }
  
  if (analysis.dominantEmotion !== 'neutral') {
    conditions.push(`market ${analysis.dominantEmotion}`);
  }
  
  if (analysis.volumeTrend !== 'stable') {
    conditions.push(`volume ${analysis.volumeTrend}`);
  }
  
  return `${action} due to ${conditions.join(', ')}`;
}

function getMarketConditions(analysis: MINDAnalysis): string[] {
  const conditions: string[] = [];
  
  if (analysis.volumeTrend !== 'stable') {
    conditions.push(`Volume ${analysis.volumeTrend}`);
  }
  
  conditions.push(`Market emotion: ${analysis.dominantEmotion}`);
  conditions.push(`Herd direction: ${analysis.herdDirection}`);
  
  if (analysis.whaleActivity) {
    conditions.push('Whale activity present');
  }
  
  return conditions;
}

function getTriggerEvents(analysis: MINDAnalysis): string[] {
  const events: string[] = [];
  
  if (analysis.panicScore > 70) {
    events.push(`High panic score: ${analysis.panicScore}%`);
  }
  
  if (analysis.devExhausted) {
    events.push('Developer token exhaustion');
  }
  
  if (analysis.whaleActivity && analysis.herdDirection === 'buying') {
    events.push('Whales accumulating');
  }
  
  return events;
}

function determineHourActivity(hourlyActivity: any): 'high' | 'medium' | 'low' {
  // Placeholder - implement based on actual hourly data
  return 'medium';
}

// ============= PUBLIC INTERFACE =============

/**
 * Main entry point - Run M.I.N.D. and generate directive
 */
export async function runMindEngine(tokenMint?: string): Promise<MINDDirective> {
  const targetToken = tokenMint || config.targetToken || '';
  
  if (!targetToken) {
    throw new Error('No token specified for M.I.N.D. analysis');
  }
  
  // Run comprehensive analysis
  const analysis = await runAnalysis(targetToken);
  
  // Log analysis summary
  console.log(`\n🧠 M.I.N.D. Analysis Complete:`);
  console.log(`   Survivability: ${analysis.survivabilityScore.toFixed(0)}%`);
  console.log(`   Confidence: ${analysis.confidenceLevel.toFixed(0)}%`);
  console.log(`   Risk Score: ${analysis.riskScore.toFixed(0)}%`);
  console.log(`   Market Emotion: ${analysis.dominantEmotion}`);
  console.log(`   Herd Direction: ${analysis.herdDirection}`);
  
  // Generate directive
  const directive = generateDirective(analysis, targetToken);
  
  console.log(`\n📋 M.I.N.D. Directive: ${directive.action}`);
  console.log(`   Execution Profile: ${directive.executionProfile}`);
  console.log(`   Position Size: ${directive.amount.value}%`);
  console.log(`   Priority: ${directive.priority}`);
  console.log(`   Reason: ${directive.reasoning.primaryReason}`);
  
  return directive;
}

// Export for testing
export { MINDAnalysis, MINDConfig };