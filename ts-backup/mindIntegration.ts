// HootBot/src/mindIntegration.ts

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { MINDReport, TokenSnapshot, TradeSuggestion, MarketAction } from './types';
import { walletManager } from './utils/walletManager';
import { integratedMarketScanner } from './scanners/integratedMarketScanner';
import { runMindEngine } from './core/mindEngine';
import dotenv from 'dotenv';

dotenv.config();

/**
 * MIND Integration Layer
 * Connects HootBot's body (execution) with MIND (decision making)
 * Implements the Brain-Body doctrine
 */
export class MINDIntegration {
  private connection: Connection;
  private isInitialized: boolean = false;
  private lastMindCheck: number = 0;
  private mindCooldown: number = 30000; // 30 seconds between MIND checks

  constructor() {
    // Initialize connection
    const rpcUrl = process.env.HELIUS_API_KEY
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
      
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.initialize();
  }

  /**
   * Initialize MIND with wallet configuration
   */
  private async initialize(): Promise<void> {
    try {
      console.log('🧠 Initializing MIND integration...');
      
      // Verify wallet is loaded
      const wallet = walletManager.getMasterWallet();
      const base58Key = walletManager.getMasterBase58SecretKey();
      
      console.log(`✅ MIND connected to wallet: ${wallet.publicKey.toBase58()}`);
      console.log(`🔑 Base58 key ready for MIND operations`);
      
      // Set up environment for MIND if needed
      if (!process.env.WALLET_SECRET_KEY) {
        process.env.WALLET_SECRET_KEY = base58Key;
      }
      
      this.isInitialized = true;
      
    } catch (error) {
      console.error('❌ Failed to initialize MIND:', error);
      throw error;
    }
  }

  /**
   * Get MIND's decision for a specific token
   */
  async getTokenDecision(tokenMint: string): Promise<{
    action: MarketAction;
    confidence: number;
    reasoning: string;
    suggestedAmount?: number;
  }> {
    // Rate limiting
    const now = Date.now();
    if (now - this.lastMindCheck < this.mindCooldown) {
      console.log('⏱️ MIND cooldown active, using cached decision');
      return {
        action: 'HOLD',
        confidence: 50,
        reasoning: 'Cooldown period - waiting for next analysis window'
      };
    }
    
    this.lastMindCheck = now;
    
    try {
      console.log(`🧠 Requesting MIND analysis for ${tokenMint}...`);
      
      // Run MIND analysis
      const mindReport = await runMindEngine();
      
      // Determine action based on survivability and market conditions
      let action: MarketAction = 'HOLD';
      let confidence = mindReport.survivabilityScore;
      
      if (mindReport.tradeSuggestion) {
        action = mindReport.tradeSuggestion.action;
      } else {
        // Fallback logic if no explicit suggestion
        if (mindReport.survivabilityScore >= 80 && mindReport.riskLevel === 'low') {
          action = 'BUY';
        } else if (mindReport.survivabilityScore < 40 || mindReport.riskLevel === 'critical') {
          action = 'EXIT';
        } else if (mindReport.panicScore && mindReport.panicScore > 70) {
          action = 'SELL';
        }
      }
      
      // Calculate suggested amount based on confidence
      const baseAmount = 0.05; // Base amount in SOL
      let suggestedAmount = baseAmount;
      
      if (confidence >= 90) suggestedAmount *= 3;
      else if (confidence >= 80) suggestedAmount *= 2;
      else if (confidence >= 70) suggestedAmount *= 1.5;
      else if (confidence < 50) suggestedAmount *= 0.5;
      
      return {
        action,
        confidence,
        reasoning: mindReport.tradeSuggestion?.reason || 'Market conditions analyzed',
        suggestedAmount
      };
      
    } catch (error) {
      console.error('❌ MIND analysis failed:', error);
      return {
        action: 'HOLD',
        confidence: 0,
        reasoning: 'Analysis error - defaulting to safe mode'
      };
    }
  }

  /**
   * Get MIND's analysis of current market conditions
   */
  async getMarketAnalysis(): Promise<{
    marketCondition: 'bullish' | 'bearish' | 'neutral';
    topOpportunities: TokenSnapshot[];
    riskLevel: string;
    recommendations: string[];
  }> {
    try {
      // Get market scan
      const scanResult = await integratedMarketScanner.scanAllMarkets({
        minVolume: 5000,
        minLiquidity: 10000,
        maxMarketCap: 5000000
      });
      
      // Run MIND analysis
      const mindReport = await runMindEngine();
      
      // Determine market condition
      let marketCondition: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      if (mindReport.marketFlowStrength > 70) {
        marketCondition = 'bullish';
      } else if (mindReport.marketFlowStrength < 30) {
        marketCondition = 'bearish';
      }
      
      // Get top opportunities based on MIND's preferences
      const topOpportunities = scanResult.allTokens
        .filter(token => {
          // Apply MIND's quality filters
          if (token.holders < 100) return false;
          if (token.liquidity < 10000) return false;
          if (token.volume24h < 5000) return false;
          return true;
        })
        .slice(0, 10);
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (marketCondition === 'bullish' && mindReport.riskLevel !== 'critical') {
        recommendations.push('Market conditions favorable for trading');
        recommendations.push(`Focus on tokens with ${mindReport.consumerProfile.shrimpPercent > 60 ? 'high retail' : 'balanced'} participation`);
      }
      
      if (mindReport.panicScore && mindReport.panicScore > 50) {
        recommendations.push('⚠️ Elevated panic levels detected - trade cautiously');
      }
      
      if (mindReport.whaleActivity) {
        recommendations.push('🐋 Whale activity detected - monitor for large moves');
      }
      
      return {
        marketCondition,
        topOpportunities,
        riskLevel: mindReport.riskLevel,
        recommendations
      };
      
    } catch (error) {
      console.error('❌ Market analysis failed:', error);
      return {
        marketCondition: 'neutral',
        topOpportunities: [],
        riskLevel: 'high',
        recommendations: ['Analysis unavailable - proceed with caution']
      };
    }
  }

  /**
   * Check if MIND approves a trade
   */
  async shouldExecuteTrade(
    tokenMint: string,
    amount: number,
    action: 'buy' | 'sell'
  ): Promise<{ approved: boolean; reason: string }> {
    const decision = await this.getTokenDecision(tokenMint);
    
    // Check if action aligns with MIND's recommendation
    if (action === 'buy' && (decision.action === 'BUY' || decision.action === 'HOLD')) {
      if (decision.confidence >= 60) {
        return { approved: true, reason: 'MIND approves buy' };
      }
      return { approved: false, reason: `Low confidence: ${decision.confidence}%` };
    }
    
    if (action === 'sell' && (decision.action === 'SELL' || decision.action === 'EXIT')) {
      return { approved: true, reason: 'MIND recommends exit' };
    }
    
    return { 
      approved: false, 
      reason: `MIND suggests ${decision.action}: ${decision.reasoning}` 
    };
  }

  /**
   * Get execution profile based on MIND's analysis
   */
  async getExecutionProfile(): Promise<{
    aggressiveness: number; // 0-1
    riskTolerance: number; // 0-1
    preferredTiming: 'immediate' | 'patient' | 'wait';
    walletStrategy: 'single' | 'rotate' | 'parallel';
  }> {
    const mindReport = await runMindEngine();
    
    // Calculate aggressiveness based on market conditions
    let aggressiveness = mindReport.survivabilityScore / 100;
    if (mindReport.riskLevel === 'critical') aggressiveness *= 0.3;
    if (mindReport.riskLevel === 'high') aggressiveness *= 0.6;
    
    // Risk tolerance
    const riskTolerance = mindReport.riskLevel === 'low' ? 0.8 : 
                         mindReport.riskLevel === 'medium' ? 0.5 : 0.2;
    
    // Timing preference
    let preferredTiming: 'immediate' | 'patient' | 'wait' = 'patient';
    if (mindReport.tradeSuggestion?.action === 'BUY' && mindReport.survivabilityScore > 80) {
      preferredTiming = 'immediate';
    } else if (mindReport.riskLevel === 'critical' || mindReport.panicScore! > 70) {
      preferredTiming = 'wait';
    }
    
    // For now, single wallet strategy (can expand with wallet pool)
    const walletStrategy = 'single';
    
    return {
      aggressiveness,
      riskTolerance,
      preferredTiming,
      walletStrategy
    };
  }
}

// Export singleton instance
export const mindIntegration = new MINDIntegration();

// Convenience function for quick decisions
export async function getMINDDecision(tokenMint: string): Promise<MarketAction> {
  const decision = await mindIntegration.getTokenDecision(tokenMint);
  return decision.action;
}