// HootBot/src/pumpTools/humanBehaviorEngine.ts

import { PublicKey, Keypair } from '@solana/web3.js';
import { getEnhancedExecutor } from './enhancedTradeExecutor';

interface BehaviorProfile {
  personality: 'aggressive' | 'cautious' | 'balanced' | 'fomo' | 'patient';
  riskTolerance: number; // 0-1
  reactionTime: {
    min: number;
    max: number;
  };
  tradePatterns: {
    morningActivity: number; // 0-1 probability
    eveningActivity: number;
    weekendActivity: number;
    panicSellThreshold: number; // % loss before panic
    profitTakeThreshold: number; // % gain before taking profit
  };
}

interface ExecutionContext {
  mindScore: number;
  marketVolatility: 'low' | 'medium' | 'high';
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  recentWins: number;
  recentLosses: number;
}

export class HumanBehaviorEngine {
  private profile: BehaviorProfile;
  private sessionHistory: Array<{
    timestamp: number;
    action: string;
    amount: number;
    success: boolean;
  }> = [];
  
  // Cooldown tracking per wallet
  private walletCooldowns: Map<string, number> = new Map();
  
  constructor(personality?: BehaviorProfile['personality']) {
    this.profile = this.generateBehaviorProfile(personality);
    console.log(`🧠 Behavior Profile: ${this.profile.personality}`);
  }

  // Generate a consistent behavior profile
  private generateBehaviorProfile(personality?: BehaviorProfile['personality']): BehaviorProfile {
    const profiles: Record<string, BehaviorProfile> = {
      aggressive: {
        personality: 'aggressive',
        riskTolerance: 0.8,
        reactionTime: { min: 500, max: 3000 },
        tradePatterns: {
          morningActivity: 0.9,
          eveningActivity: 0.7,
          weekendActivity: 0.6,
          panicSellThreshold: -15,
          profitTakeThreshold: 25
        }
      },
      cautious: {
        personality: 'cautious',
        riskTolerance: 0.3,
        reactionTime: { min: 5000, max: 30000 },
        tradePatterns: {
          morningActivity: 0.5,
          eveningActivity: 0.3,
          weekendActivity: 0.2,
          panicSellThreshold: -5,
          profitTakeThreshold: 10
        }
      },
      balanced: {
        personality: 'balanced',
        riskTolerance: 0.5,
        reactionTime: { min: 2000, max: 10000 },
        tradePatterns: {
          morningActivity: 0.7,
          eveningActivity: 0.6,
          weekendActivity: 0.4,
          panicSellThreshold: -10,
          profitTakeThreshold: 20
        }
      },
      fomo: {
        personality: 'fomo',
        riskTolerance: 0.9,
        reactionTime: { min: 100, max: 1000 },
        tradePatterns: {
          morningActivity: 0.8,
          eveningActivity: 0.9,
          weekendActivity: 0.8,
          panicSellThreshold: -20,
          profitTakeThreshold: 50
        }
      },
      patient: {
        personality: 'patient',
        riskTolerance: 0.4,
        reactionTime: { min: 10000, max: 60000 },
        tradePatterns: {
          morningActivity: 0.4,
          eveningActivity: 0.3,
          weekendActivity: 0.1,
          panicSellThreshold: -8,
          profitTakeThreshold: 30
        }
      }
    };

    return profiles[personality || 'balanced'];
  }

  // Get human-like reaction time based on context
  getReactionTime(context: ExecutionContext): number {
    const base = this.profile.reactionTime.min + 
      Math.random() * (this.profile.reactionTime.max - this.profile.reactionTime.min);

    // Adjust based on context
    let multiplier = 1;

    // Faster reactions during high volatility
    if (context.marketVolatility === 'high') {
      multiplier *= 0.7;
    }

    // Slower reactions after losses (hesitation)
    if (context.recentLosses > 2) {
      multiplier *= 1.5;
    }

    // FOMO kicks in after wins
    if (context.recentWins > 2 && this.profile.personality === 'fomo') {
      multiplier *= 0.5;
    }

    // Time of day affects reaction speed
    const hour = context.timeOfDay;
    if (hour >= 2 && hour <= 6) { // Late night = slower
      multiplier *= 1.3;
    } else if (hour >= 9 && hour <= 11) { // Morning = alert
      multiplier *= 0.9;
    }

    return Math.round(base * multiplier);
  }

  // Determine if we should act based on human patterns
  shouldAct(context: ExecutionContext): boolean {
    const hour = context.timeOfDay;
    const day = context.dayOfWeek;
    
    // Check time-based activity patterns
    let activityProbability = 0.5;
    
    if (hour >= 6 && hour <= 12) {
      activityProbability = this.profile.tradePatterns.morningActivity;
    } else if (hour >= 18 && hour <= 23) {
      activityProbability = this.profile.tradePatterns.eveningActivity;
    }
    
    // Weekend adjustment
    if (day === 0 || day === 6) {
      activityProbability *= this.profile.tradePatterns.weekendActivity;
    }
    
    // MIND score influence
    if (context.mindScore > 80) {
      activityProbability = Math.min(activityProbability * 1.3, 0.95);
    } else if (context.mindScore < 40) {
      activityProbability *= 0.5;
    }
    
    // Recent activity influence (avoid being too predictable)
    const recentActions = this.sessionHistory.filter(
      h => Date.now() - h.timestamp < 3600000 // Last hour
    ).length;
    
    if (recentActions > 5) {
      activityProbability *= 0.3; // Slow down if too active
    }
    
    return Math.random() < activityProbability;
  }

  // Calculate position size with human-like variation
  calculatePositionSize(
    baseAmount: number,
    context: ExecutionContext
  ): number {
    // Base variation
    let size = baseAmount;
    
    // Risk adjustment based on personality
    size *= (0.5 + this.profile.riskTolerance * 0.5);
    
    // MIND score influence
    const mindMultiplier = 0.5 + (context.mindScore / 100) * 0.5;
    size *= mindMultiplier;
    
    // Volatility adjustment
    if (context.marketVolatility === 'high') {
      size *= this.profile.personality === 'aggressive' ? 1.2 : 0.8;
    }
    
    // Recent performance influence
    if (context.recentWins > context.recentLosses) {
      size *= 1.1; // Confidence boost
    } else if (context.recentLosses > context.recentWins) {
      size *= 0.9; // Cautious after losses
    }
    
    // Add random variation (±20%)
    const variation = 0.8 + Math.random() * 0.4;
    size *= variation;
    
    // Round to reasonable precision
    return Math.round(size * 1000) / 1000;
  }

  // Select wallet with cooldown management
  selectWallet(wallets: Keypair[]): Keypair | null {
    const now = Date.now();
    const availableWallets = wallets.filter(wallet => {
      const address = wallet.publicKey.toBase58();
      const lastUsed = this.walletCooldowns.get(address) || 0;
      
      // Minimum cooldown based on personality
      const minCooldown = this.profile.personality === 'aggressive' 
        ? 5 * 60 * 1000  // 5 minutes
        : 15 * 60 * 1000; // 15 minutes
      
      return now - lastUsed > minCooldown;
    });
    
    if (availableWallets.length === 0) {
      console.log('⏳ All wallets on cooldown');
      return null;
    }
    
    // Random selection with bias towards least recently used
    const selected = availableWallets.sort((a, b) => {
      const aLastUsed = this.walletCooldowns.get(a.publicKey.toBase58()) || 0;
      const bLastUsed = this.walletCooldowns.get(b.publicKey.toBase58()) || 0;
      return aLastUsed - bLastUsed;
    })[0];
    
    // Update cooldown
    this.walletCooldowns.set(selected.publicKey.toBase58(), now);
    
    return selected;
  }

  // Execute trade with human-like behavior
  async executeHumanTrade(
    tokenMint: string,
    mindScore: number,
    baseAmount: number = 0.05,
    wallets?: Keypair[]
  ): Promise<string | null> {
    const context: ExecutionContext = {
      mindScore,
      marketVolatility: this.assessVolatility(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      recentWins: this.sessionHistory.filter(h => h.success).length,
      recentLosses: this.sessionHistory.filter(h => !h.success).length
    };
    
    // Decision: Should we act?
    if (!this.shouldAct(context)) {
      console.log('🤔 Decided not to trade (human pattern)');
      return null;
    }
    
    // Wait for human reaction time
    const reactionTime = this.getReactionTime(context);
    console.log(`⏱️ Human reaction time: ${reactionTime}ms`);
    await new Promise(resolve => setTimeout(resolve, reactionTime));
    
    // Calculate position size
    const positionSize = this.calculatePositionSize(baseAmount, context);
    console.log(`💰 Position size: ${positionSize.toFixed(3)} SOL`);
    
    // Execute trade
    try {
      const executor = getEnhancedExecutor();
      const signature = await executor.executeBuy(tokenMint, positionSize);
      
      // Record in history
      this.sessionHistory.push({
        timestamp: Date.now(),
        action: 'buy',
        amount: positionSize,
        success: !!signature
      });
      
      // Cleanup old history
      const oneHourAgo = Date.now() - 3600000;
      this.sessionHistory = this.sessionHistory.filter(
        h => h.timestamp > oneHourAgo
      );
      
      return signature;
    } catch (error) {
      console.error('Trade failed:', error);
      this.sessionHistory.push({
        timestamp: Date.now(),
        action: 'buy',
        amount: positionSize,
        success: false
      });
      return null;
    }
  }

  // Assess current market volatility (simplified)
  private assessVolatility(): 'low' | 'medium' | 'high' {
    // In production, this would analyze actual price movements
    const random = Math.random();
    if (random < 0.3) return 'low';
    if (random < 0.7) return 'medium';
    return 'high';
  }

  // Check if we should panic sell
  shouldPanicSell(currentLoss: number): boolean {
    return currentLoss <= this.profile.tradePatterns.panicSellThreshold;
  }

  // Check if we should take profit
  shouldTakeProfit(currentGain: number): boolean {
    // Add some randomness to avoid being too predictable
    const threshold = this.profile.tradePatterns.profitTakeThreshold;
    const adjustedThreshold = threshold * (0.8 + Math.random() * 0.4);
    return currentGain >= adjustedThreshold;
  }
}

// Export singleton instances for each personality type
export const aggressiveTrader = new HumanBehaviorEngine('aggressive');
export const cautiousTrader = new HumanBehaviorEngine('cautious');
export const balancedTrader = new HumanBehaviorEngine('balanced');
export const fomoTrader = new HumanBehaviorEngine('fomo');
export const patientTrader = new HumanBehaviorEngine('patient');