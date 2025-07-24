// HootBot/src/pumpTools/pumpBot.ts

import dotenv from 'dotenv';
dotenv.config();

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { mind } from './mindClient';
import { 
  initiateCoordinatedBuy, 
  executeTrade, 
  executeIntelligentTrade,
  executePanicBuy 
} from './tradeExecutor';
import { 
  getBuySize, 
  getNextTradeDelay, 
  generateBehaviorPattern,
  getHumanReactionTime,
  varyAmount,
  shouldAct,
  getTimeBasedMultiplier 
} from './randomUtils';

// Token configuration
const DUTCHBROS_TOKEN = process.env.DUTCHBROS_TOKEN_MINT || 'BKjx5R9AuxXMUVM2hSxu1CkPSSdBCzJraMzEc8WZ7tvh';
const WALLET_SECRET = process.env.WALLET_SECRET_KEY || '';

// Trading session configuration
interface TradingSession {
  isActive: boolean;
  startTime: number;
  endTime: number;
  tradesExecuted: number;
  volumeGenerated: number;
  successRate: number;
  behaviorProfile: ReturnType<typeof generateBehaviorPattern>;
}

interface PumpBotConfig {
  minSessionDuration: number;  // 30 minutes
  maxSessionDuration: number;  // 90 minutes
  minDormantPeriod: number;    // 15 minutes
  maxDormantPeriod: number;    // 60 minutes
  baseTradeSize: number;       // 0.05 SOL
  maxTradeSize: number;        // 2 SOL
  whaleThreshold: number;      // 5 SOL
  panicMultiplier: number;     // 2.5x on panic events
}

class DutchBrosPumpBot {
  private session: TradingSession;
  private config: PumpBotConfig;
  private connection: Connection;
  private tokenAddress: string;
  private consecutiveSkips: number = 0;
  private lastMindCheck: number = 0;
  private mindCacheDuration: number = 30000; // 30 seconds
  private whaleMode: boolean = false;
  private volumeTargets: {
    daily: number;
    achieved: number;
  };

  constructor() {
    this.tokenAddress = DUTCHBROS_TOKEN;
    this.config = {
      minSessionDuration: 30 * 60 * 1000,
      maxSessionDuration: 90 * 60 * 1000,
      minDormantPeriod: 15 * 60 * 1000,
      maxDormantPeriod: 60 * 60 * 1000,
      baseTradeSize: 0.05,
      maxTradeSize: 2.0,
      whaleThreshold: 5.0,
      panicMultiplier: 2.5
    };

    this.connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    this.volumeTargets = {
      daily: 100, // 100 SOL daily volume target
      achieved: 0
    };

    this.session = this.createNewSession();
    
    console.log(`🦉 DutchBros PumpBot initialized`);
    console.log(`☕ Token: ${this.tokenAddress}`);
    console.log(`🎯 Daily volume target: ${this.volumeTargets.daily} SOL`);
  }

  private createNewSession(): TradingSession {
    const duration = this.randomBetween(
      this.config.minSessionDuration,
      this.config.maxSessionDuration
    );

    return {
      isActive: true,
      startTime: Date.now(),
      endTime: Date.now() + duration,
      tradesExecuted: 0,
      volumeGenerated: 0,
      successRate: 0,
      behaviorProfile: generateBehaviorPattern()
    };
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private async checkMarketConditions() {
    // Check if we need fresh MIND data
    if (Date.now() - this.lastMindCheck > this.mindCacheDuration) {
      try {
        const marketState = await mind.getMarketState(this.tokenAddress);
        this.lastMindCheck = Date.now();
        return marketState;
      } catch (error) {
        console.error('❌ Failed to get MIND state:', error);
        // Return mock state as fallback
        return this.getMockMindState();
      }
    }
    
    return await mind.getMarketState(this.tokenAddress);
  }

  private getMockMindState() {
    // Fallback mock MIND state for testing
    return {
      isDipping: Math.random() > 0.7,
      isPumping: Math.random() > 0.8,
      survivabilityScore: 65 + Math.random() * 20,
      panicScore: Math.random() * 30,
      devExhaustion: 75 + Math.random() * 25,
      recommendation: Math.random() > 0.6 ? "BUY" : "HOLD" as any,
      recommendedPercentage: 50 + Math.random() * 50,
      reason: "Mock analysis - real MIND unavailable"
    };
  }

  private async executeStrategicTrade() {
    const marketState = await this.checkMarketConditions();
    const timeMultiplier = getTimeBasedMultiplier();
    const behaviorMultiplier = this.session.behaviorProfile.aggressiveness;
    
    console.log(`\n🔍 Market Analysis at ${new Date().toLocaleTimeString()}`);
    console.log(`   Survivability: ${marketState.survivabilityScore.toFixed(1)}%`);
    console.log(`   Panic Level: ${marketState.panicScore.toFixed(1)}%`);
    console.log(`   Dev Exhaustion: ${marketState.devExhaustion.toFixed(1)}%`);
    console.log(`   Time Activity: ${timeMultiplier}x`);

    // Decision tree based on market conditions
    if (marketState.recommendation === "EXIT" || marketState.panicScore > 70) {
      console.log(`🚫 SKIP - High panic detected (${marketState.panicScore}%)`);
      this.consecutiveSkips++;
      return;
    }

    // Whale injection on perfect conditions
    if (marketState.survivabilityScore > 85 && 
        marketState.devExhaustion > 90 && 
        marketState.panicScore < 10 &&
        !this.whaleMode) {
      await this.executeWhaleInjection();
      return;
    }

    // Panic buy on deep dips
    if (marketState.isDipping && marketState.survivabilityScore > 60) {
      const panicSize = this.config.baseTradeSize * this.config.panicMultiplier * timeMultiplier;
      console.log(`🔴 DIP DETECTED! Executing panic buy: ${panicSize.toFixed(4)} SOL`);
      
      await this.simulateHumanDelay();
      await executePanicBuy(panicSize / this.config.baseTradeSize);
      
      this.updateSessionStats(panicSize);
      this.consecutiveSkips = 0;
      return;
    }

    // Standard buy logic with behavior modulation
    if (marketState.recommendation === "BUY") {
      const baseSize = getBuySize(this.config.baseTradeSize);
      const finalSize = baseSize * timeMultiplier * behaviorMultiplier;
      
      // Add variance based on trader personality
      const shouldExecute = shouldAct(
        this.session.behaviorProfile.riskTolerance * (marketState.recommendedPercentage / 100)
      );

      if (shouldExecute) {
        console.log(`✅ Executing strategic buy: ${finalSize.toFixed(4)} SOL`);
        console.log(`   Confidence: ${marketState.recommendedPercentage.toFixed(1)}%`);
        console.log(`   Reason: ${marketState.reason}`);
        
        await this.simulateHumanDelay();
        await initiateCoordinatedBuy(finalSize);
        
        this.updateSessionStats(finalSize);
        this.consecutiveSkips = 0;
      } else {
        console.log(`⏸️ Skipping - Risk tolerance not met`);
        this.consecutiveSkips++;
      }
    } else {
      console.log(`⏭️ HOLD signal - waiting for better entry`);
      this.consecutiveSkips++;
    }
  }

  private async executeWhaleInjection() {
    this.whaleMode = true;
    const whaleSize = this.config.whaleThreshold + Math.random() * 5; // 5-10 SOL
    
    console.log(`\n🐋 WHALE MODE ACTIVATED!`);
    console.log(`   Injecting ${whaleSize.toFixed(2)} SOL`);
    console.log(`   Creating FOMO momentum...`);
    
    // Execute whale buy
    await initiateCoordinatedBuy(whaleSize);
    this.updateSessionStats(whaleSize);
    
    // Follow up with smaller "FOMO" buys
    setTimeout(async () => {
      for (let i = 0; i < 3; i++) {
        const fomoSize = 0.5 + Math.random() * 1.5;
        await this.simulateHumanDelay();
        await initiateCoordinatedBuy(fomoSize);
        this.updateSessionStats(fomoSize);
        console.log(`   🏃 FOMO buy ${i + 1}: ${fomoSize.toFixed(3)} SOL`);
      }
    }, 5000);
    
    // Cooldown period
    setTimeout(() => {
      this.whaleMode = false;
      console.log(`🐋 Whale mode deactivated`);
    }, 300000); // 5 minute cooldown
  }

  private async simulateHumanDelay() {
    const delay = getHumanReactionTime();
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  private updateSessionStats(tradeSize: number) {
    this.session.tradesExecuted++;
    this.session.volumeGenerated += tradeSize;
    this.volumeTargets.achieved += tradeSize;
    
    // Update success rate (simplified)
    this.session.successRate = (this.session.tradesExecuted / (this.session.tradesExecuted + this.consecutiveSkips)) * 100;
  }

  private async enterDormantPhase() {
    const dormantDuration = this.randomBetween(
      this.config.minDormantPeriod,
      this.config.maxDormantPeriod
    );
    
    console.log(`\n😴 Entering dormant phase for ${(dormantDuration / 60000).toFixed(1)} minutes`);
    console.log(`📊 Session Summary:`);
    console.log(`   Trades: ${this.session.tradesExecuted}`);
    console.log(`   Volume: ${this.session.volumeGenerated.toFixed(2)} SOL`);
    console.log(`   Success Rate: ${this.session.successRate.toFixed(1)}%`);
    console.log(`   Daily Progress: ${((this.volumeTargets.achieved / this.volumeTargets.daily) * 100).toFixed(1)}%`);
    
    this.session.isActive = false;
    
    setTimeout(() => {
      this.session = this.createNewSession();
      console.log(`\n🔥 Reactivating DutchBros PumpBot!`);
      console.log(`☕ New session personality:`);
      console.log(`   Aggressiveness: ${(this.session.behaviorProfile.aggressiveness * 100).toFixed(0)}%`);
      console.log(`   Risk Tolerance: ${(this.session.behaviorProfile.riskTolerance * 100).toFixed(0)}%`);
      this.run();
    }, dormantDuration);
  }

  async run() {
    console.log(`\n🚀 DutchBros PumpBot Session Started!`);
    console.log(`⏰ Duration: ${((this.session.endTime - this.session.startTime) / 60000).toFixed(1)} minutes`);
    
    const loop = async () => {
      // Check if session should end
      if (Date.now() > this.session.endTime || this.consecutiveSkips > 10) {
        await this.enterDormantPhase();
        return;
      }

      // Check if still in active session
      if (!this.session.isActive) {
        return;
      }

      try {
        await this.executeStrategicTrade();
      } catch (error) {
        console.error(`❌ Trade execution error:`, error);
      }

      // Calculate next delay with personality modulation
      const baseDelay = getNextTradeDelay(45000); // 45 second average
      const personalityFactor = 2 - this.session.behaviorProfile.aggressiveness;
      const nextDelay = baseDelay * personalityFactor;
      
      console.log(`⏱️ Next trade in ${(nextDelay / 1000).toFixed(1)}s`);
      
      setTimeout(loop, nextDelay);
    };

    // Start the loop
    loop();
  }

  // Paper hands simulation - randomly sell small amounts
  async simulatePaperHands() {
    if (Math.random() > 0.95) { // 5% chance
      console.log(`📄 Simulating paper hands sell...`);
      // TODO: Implement sell logic when available
    }
  }
}

// Initialize and run the bot
const dutchBrosBot = new DutchBrosPumpBot();

// Start the bot
console.log(`\n☕ Starting DutchBros PumpBot...`);
console.log(`🦉 Powered by HootBot MIND 1.0`);
console.log(`📍 Token: ${DUTCHBROS_TOKEN}`);

dutchBrosBot.run();

// Export for potential external control
export { DutchBrosPumpBot, dutchBrosBot };