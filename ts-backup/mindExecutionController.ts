// HootBot/src/pumpTools/mindExecutionController.ts

import { mind } from './mindClient';
import { getWalletCoordinator } from './walletCoordinator';
import { getEnhancedExecutor } from './enhancedTradeExecutor';
import { 
  aggressiveTrader, 
  cautiousTrader, 
  balancedTrader,
  HumanBehaviorEngine 
} from './humanBehaviorEngine';

interface ExecutionDecision {
  action: 'BUY' | 'SELL' | 'HOLD' | 'RAID';
  confidence: number;
  strategy: 'single' | 'coordinated' | 'panic' | 'dca';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reasoning: string;
}

interface MarketContext {
  tokenMint: string;
  currentPrice?: number;
  volume24h?: number;
  volatility?: 'low' | 'medium' | 'high';
  momentum?: 'bullish' | 'neutral' | 'bearish';
}

export class MindExecutionController {
  private coordinator = getWalletCoordinator();
  private executor = getEnhancedExecutor();
  private activePositions: Map<string, {
    entryPrice: number;
    amount: number;
    timestamp: number;
    mindScoreAtEntry: number;
  }> = new Map();

  constructor() {
    console.log('🧠 M.I.N.D. Execution Controller initialized');
  }

  // Main execution flow
  async execute(tokenMint: string, context?: MarketContext): Promise<void> {
    console.log('\n🎯 M.I.N.D. EXECUTION ANALYSIS');
    console.log('═'.repeat(50));
    
    try {
      // 1. Get M.I.N.D. analysis
      const mindState = await mind.getMarketState(tokenMint);
      console.log(`\n🧠 M.I.N.D. Analysis:`);
      console.log(`   Survivability: ${mindState.survivabilityScore}%`);
      console.log(`   Recommendation: ${mindState.recommendation}`);
      console.log(`   Confidence: ${mindState.recommendedPercentage}%`);
      console.log(`   Reasoning: ${mindState.reason}`);

      // 2. Determine execution strategy
      const decision = this.determineExecutionStrategy(mindState, context);
      console.log(`\n📋 Execution Decision:`);
      console.log(`   Action: ${decision.action}`);
      console.log(`   Strategy: ${decision.strategy}`);
      console.log(`   Urgency: ${decision.urgency}`);
      console.log(`   Confidence: ${decision.confidence}%`);

      // 3. Execute based on decision
      await this.executeDecision(tokenMint, decision, mindState);

    } catch (error) {
      console.error('❌ Execution failed:', error);
    }
  }

  // Determine optimal execution strategy
  private determineExecutionStrategy(
    mindState: any,
    context?: MarketContext
  ): ExecutionDecision {
    const score = mindState.survivabilityScore;
    const recommendation = mindState.recommendation;
    
    // Default decision
    let decision: ExecutionDecision = {
      action: 'HOLD',
      confidence: 50,
      strategy: 'single',
      urgency: 'low',
      reasoning: 'Awaiting better opportunity'
    };

    // Strong BUY signals
    if (recommendation === 'BUY' && score >= 80) {
      decision = {
        action: 'BUY',
        confidence: score,
        strategy: score >= 90 ? 'coordinated' : 'single',
        urgency: score >= 95 ? 'critical' : 'high',
        reasoning: `High confidence buy signal (${score}%)`
      };
    }
    // Moderate BUY signals
    else if (recommendation === 'BUY' && score >= 60) {
      decision = {
        action: 'BUY',
        confidence: score,
        strategy: 'single',
        urgency: 'medium',
        reasoning: `Moderate buy opportunity (${score}%)`
      };
    }
    // SELL signals
    else if (recommendation === 'SELL' || recommendation === 'EXIT') {
      const urgency = score < 30 ? 'critical' : 'high';
      decision = {
        action: 'SELL',
        confidence: 100 - score,
        strategy: urgency === 'critical' ? 'panic' : 'single',
        urgency,
        reasoning: mindState.reason || 'Risk detected'
      };
    }
    // DCA opportunity
    else if (recommendation === 'HOLD' && score >= 50 && score <= 70) {
      decision = {
        action: 'BUY',
        confidence: score,
        strategy: 'dca',
        urgency: 'low',
        reasoning: 'Dollar cost averaging opportunity'
      };
    }

    // Adjust based on market context
    if (context?.volatility === 'high' && decision.action === 'BUY') {
      decision.confidence *= 0.8;
      decision.urgency = 'medium';
    }

    return decision;
  }

  // Execute the decision
  private async executeDecision(
    tokenMint: string,
    decision: ExecutionDecision,
    mindState: any
  ): Promise<void> {
    switch (decision.action) {
      case 'BUY':
        await this.executeBuy(tokenMint, decision, mindState);
        break;
      
      case 'SELL':
        await this.executeSell(tokenMint, decision);
        break;
      
      case 'HOLD':
        console.log('📊 Holding position - no action taken');
        break;
      
      case 'RAID':
        await this.executeRaid(tokenMint, decision);
        break;
    }
  }

  // Execute buy based on strategy
  private async executeBuy(
    tokenMint: string,
    decision: ExecutionDecision,
    mindState: any
  ): Promise<void> {
    const baseAmount = this.calculatePositionSize(decision, mindState);
    
    switch (decision.strategy) {
      case 'single':
        // Use appropriate behavior based on urgency
        const trader = decision.urgency === 'high' 
          ? aggressiveTrader 
          : decision.urgency === 'low' 
          ? cautiousTrader 
          : balancedTrader;
        
        const signature = await trader.executeHumanTrade(
          tokenMint,
          mindState.survivabilityScore,
          baseAmount
        );
        
        if (signature) {
          this.recordPosition(tokenMint, baseAmount, mindState.survivabilityScore);
        }
        break;
      
      case 'coordinated':
        // Multi-wallet coordinated buy
        const totalAmount = baseAmount * 3; // Scale up for coordinated attack
        await this.coordinator.executeCoordinatedBuy({
          tokenMint,
          totalAmount,
          walletCount: Math.min(5, Math.floor(decision.confidence / 20)),
          strategy: decision.urgency === 'critical' ? 'burst' : 'wave',
          timeWindow: decision.urgency === 'critical' ? 5000 : 30000
        });
        break;
      
      case 'panic':
        // Panic buy with higher amounts
        await this.executor.executePanicBuy(tokenMint, baseAmount * 2);
        break;
      
      case 'dca':
        // Dollar cost averaging - smaller amounts
        const dcaAmount = baseAmount * 0.3;
        console.log(`💰 DCA Buy: ${dcaAmount.toFixed(3)} SOL`);
        await balancedTrader.executeHumanTrade(
          tokenMint,
          mindState.survivabilityScore,
          dcaAmount
        );
        break;
    }
  }

  // Execute sell
  private async executeSell(
    tokenMint: string,
    decision: ExecutionDecision
  ): Promise<void> {
    const position = this.activePositions.get(tokenMint);
    if (!position) {
      console.log('📊 No position to sell');
      return;
    }

    console.log(`\n💰 SELLING POSITION`);
    console.log(`   Entry MIND Score: ${position.mindScoreAtEntry}%`);
    console.log(`   Hold Duration: ${Math.round((Date.now() - position.timestamp) / 60000)} minutes`);
    
    // In production, this would execute actual sell
    console.log(`   ⚠️ Manual sell required for ${tokenMint}`);
    
    // Clear position
    this.activePositions.delete(tokenMint);
  }

  // Execute raid
  private async executeRaid(
    tokenMint: string,
    decision: ExecutionDecision
  ): Promise<void> {
    console.log(`\n🚨 RAID MODE ACTIVATED`);
    const { getEnhancedRaidBot } = await import('./enhancedRaidHootBot');
    const raidBot = getEnhancedRaidBot();
    await raidBot.executeRaidSequence(tokenMint, true);
  }

  // Calculate position size based on confidence and risk
  private calculatePositionSize(
    decision: ExecutionDecision,
    mindState: any
  ): number {
    const baseSize = 0.05; // Base position size in SOL
    
    // Scale by confidence
    let multiplier = decision.confidence / 100;
    
    // Adjust for urgency
    if (decision.urgency === 'critical') {
      multiplier *= 1.5;
    } else if (decision.urgency === 'low') {
      multiplier *= 0.7;
    }
    
    // Cap maximum position size
    const maxSize = 0.5; // Maximum 0.5 SOL per position
    const size = Math.min(baseSize * multiplier, maxSize);
    
    return Math.round(size * 1000) / 1000; // Round to 3 decimals
  }

  // Record position for tracking
  private recordPosition(
    tokenMint: string,
    amount: number,
    mindScore: number
  ): void {
    this.activePositions.set(tokenMint, {
      entryPrice: 0, // Would fetch actual price in production
      amount,
      timestamp: Date.now(),
      mindScoreAtEntry: mindScore
    });
  }

  // Monitor active positions
  async monitorPositions(): Promise<void> {
    console.log('\n📊 MONITORING ACTIVE POSITIONS');
    console.log('═'.repeat(50));
    
    for (const [tokenMint, position] of this.activePositions) {
      console.log(`\n🪙 Token: ${tokenMint.slice(0, 8)}...`);
      
      // Get current M.I.N.D. analysis
      const currentState = await mind.getMarketState(tokenMint);
      const scoreChange = currentState.survivabilityScore - position.mindScoreAtEntry;
      
      console.log(`   Entry Score: ${position.mindScoreAtEntry}%`);
      console.log(`   Current Score: ${currentState.survivabilityScore}%`);
      console.log(`   Change: ${scoreChange > 0 ? '📈' : '📉'} ${Math.abs(scoreChange)}%`);
      
      // Check exit conditions
      if (currentState.recommendation === 'SELL' || 
          currentState.survivabilityScore < 40) {
        console.log(`   ⚠️ EXIT SIGNAL - Consider selling!`);
      } else if (scoreChange > 20) {
        console.log(`   💰 PROFIT OPPORTUNITY - Consider taking profits!`);
      }
    }
  }
}

// Export singleton instance
let controllerInstance: MindExecutionController | null = null;

export function getMindExecutionController(): MindExecutionController {
  if (!controllerInstance) {
    controllerInstance = new MindExecutionController();
  }
  return controllerInstance;
}

// Convenience function for quick execution
export async function executeMindTrade(tokenMint: string): Promise<void> {
  const controller = getMindExecutionController();
  await controller.execute(tokenMint);
}