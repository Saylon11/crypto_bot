// src/pumpBot/mindClient.ts

import { runMindEngine, MINDReport } from '../core/mindEngine';
import { fetchBehaviorFromHelius } from '../utils/apiClient';
import { WalletData } from '../types';

export interface MarketState {
  isDipping: boolean;
  isPumping: boolean;
  survivabilityScore: number;
  panicScore: number;
  devExhaustion: number;
  recommendation: "BUY" | "SELL" | "HOLD" | "PAUSE" | "EXIT";
  recommendedPercentage: number;
  reason: string;
}

class MindClient {
  private lastReport: MINDReport | null = null;
  private lastFetchTime: number = 0;
  private cacheTimeout: number = 60000; // 1 minute cache

  /**
   * Get the current market state for a token by running MIND analysis
   */
  async getMarketState(tokenAddress: string): Promise<MarketState> {
    console.log(`🧠 MIND analyzing market state for ${tokenAddress}...`);
    
    // Use cached report if recent
    if (this.lastReport && (Date.now() - this.lastFetchTime < this.cacheTimeout)) {
      return this.parseMarketState(this.lastReport);
    }

    try {
      // Run full MIND analysis
      const report = await runMindEngine();
      this.lastReport = report;
      this.lastFetchTime = Date.now();
      
      return this.parseMarketState(report);
    } catch (error) {
      console.error('❌ MIND analysis failed:', error);
      // Return safe defaults on error
      return {
        isDipping: false,
        isPumping: false,
        survivabilityScore: 0,
        panicScore: 0,
        devExhaustion: 0,
        recommendation: "HOLD",
        recommendedPercentage: 0,
        reason: "Analysis unavailable"
      };
    }
  }

  /**
   * Parse MIND report into simplified market state
   */
  private parseMarketState(report: MINDReport): MarketState {
    // Determine if dipping based on panic score and market flow
    const isDipping = report.marketFlowStrength < 30 || 
                     (report.tradeSuggestion.action === "EXIT" || 
                      report.tradeSuggestion.action === "SELL");
    
    // Determine if pumping based on survivability and flow strength
    const isPumping = report.survivabilityScore > 70 && 
                     report.marketFlowStrength > 70 &&
                     report.tradeSuggestion.action === "BUY";

    // Extract dev exhaustion from the snapshot data
    // Note: We'll need to pass this through from mindEngine
    const devExhaustion = 0; // TODO: Add to MINDReport interface

    return {
      isDipping,
      isPumping,
      survivabilityScore: report.survivabilityScore,
      panicScore: 0, // TODO: Add panic score to MINDReport
      devExhaustion,
      recommendation: report.tradeSuggestion.action,
      recommendedPercentage: report.tradeSuggestion.percentage,
      reason: report.tradeSuggestion.reason
    };
  }

  /**
   * Get quick sentiment check without full analysis
   */
  async getQuickSentiment(walletAddress: string): Promise<number> {
    try {
      const walletData = await fetchBehaviorFromHelius(walletAddress);
      const buys = walletData.filter(w => w.type === "buy").length;
      const sells = walletData.filter(w => w.type === "sell").length;
      const total = buys + sells || 1;
      
      return (buys / total) * 100; // Buy percentage
    } catch (error) {
      console.error('❌ Quick sentiment check failed:', error);
      return 50; // Neutral
    }
  }

  /**
   * Check if it's a good time to trade based on MIND analysis
   */
  async shouldTrade(): Promise<{ shouldTrade: boolean; confidence: number; reason: string }> {
    const state = await this.getMarketState(process.env.TEST_TOKEN_ADDRESS || '');
    
    if (state.recommendation === "BUY" && state.recommendedPercentage > 50) {
      return {
        shouldTrade: true,
        confidence: state.recommendedPercentage,
        reason: state.reason
      };
    }
    
    if (state.recommendation === "HOLD" || state.recommendation === "PAUSE") {
      return {
        shouldTrade: false,
        confidence: 0,
        reason: state.reason
      };
    }
    
    return {
      shouldTrade: false,
      confidence: 0,
      reason: "Market conditions unfavorable"
    };
  }
}

// Export singleton instance
export const mind = new MindClient();