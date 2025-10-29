// HootBot/src/executor/HootBotExecutor.ts
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { MindDirective, ExecutionProfile } from '../mind/mindCore';
import { DirectiveValidator, ContractEvent, ContractMetrics } from '../mind/contract';
import { executeBuy } from '../pumpTools/tradeExecutor';
import { WalletManager } from './walletManager';
import { randomInt } from 'crypto';

/**
 * HootBot Executor - The Physical Body
 * Executes directives from M.I.N.D. with human-like behavior
 */
export class HootBotExecutor {
  private connection: Connection;
  private walletManager: WalletManager;
  private lastExecutionTime: Map<string, number> = new Map(); // Track per-wallet cooldowns
  private executionQueue: MindDirective[] = [];
  private isExecuting: boolean = false;
  
  // Contract metrics
  private metrics: ContractMetrics = {
    totalDirectivesSent: 0,
    totalDirectivesValidated: 0,
    totalDirectivesRejected: 0,
    totalExecutionsStarted: 0,
    totalExecutionsCompleted: 0,
    totalExecutionsFailed: 0,
    lastDirectiveTime: 0,
    lastExecutionTime: 0
  };
  
  constructor(connection: Connection, walletManager: WalletManager) {
    this.connection = connection;
    this.walletManager = walletManager;
  }
  
  /**
   * Main execution method - receives directives from M.I.N.D.
   */
  async execute(directive: MindDirective): Promise<void> {
    this.metrics.totalDirectivesSent++;
    this.metrics.lastDirectiveTime = Date.now();
    
    // Validate directive against contract
    if (!DirectiveValidator.validate(directive)) {
      console.error('🚫 Rejected invalid directive');
      this.metrics.totalDirectivesRejected++;
      return;
    }
    
    this.metrics.totalDirectivesValidated++;
    
    console.log('\n📨 Received M.I.N.D. Directive:');
    console.log(`   Action: ${directive.action}`);
    console.log(`   Token: ${directive.tokenAddress.slice(0, 8)}...`);
    console.log(`   Confidence: ${directive.confidence}%`);
    console.log(`   Priority: ${directive.priority}`);
    console.log(`   Reason: ${directive.reason}`);
    
    // Handle based on priority
    if (directive.priority === 'CRITICAL') {
      // Execute immediately for critical directives
      await this.executeDirective(directive);
    } else {
      // Queue for human-like execution timing
      this.executionQueue.push(directive);
      this.processQueue();
    }
  }
  
  /**
   * Processes queued directives with human-like timing
   */
  private async processQueue(): Promise<void> {
    if (this.isExecuting || this.executionQueue.length === 0) {
      return;
    }
    
    this.isExecuting = true;
    
    while (this.executionQueue.length > 0) {
      const directive = this.executionQueue.shift()!;
      
      // Calculate human-like delay
      const delay = this.calculateExecutionDelay(directive.executionProfile);
      
      console.log(`⏳ Waiting ${(delay / 1000).toFixed(1)}s for natural timing...`);
      await this.sleep(delay);
      
      await this.executeDirective(directive);
    }
    
    this.isExecuting = false;
  }
  
  /**
   * Executes a single directive
   */
  private async executeDirective(directive: MindDirective): Promise<void> {
    this.metrics.totalExecutionsStarted++;
    this.metrics.lastExecutionTime = Date.now();
    
    try {
      switch (directive.action) {
        case 'BUY':
          await this.executeBuyDirective(directive);
          break;
        case 'SELL':
          await this.executeSellDirective(directive);
          break;
        case 'WAIT':
          console.log('⏸️  Executing WAIT directive - no action taken');
          break;
      }
      
      this.metrics.totalExecutionsCompleted++;
    } catch (error) {
      console.error('❌ Execution error:', error);
      this.metrics.totalExecutionsFailed++;
    }
  }
  
  /**
   * Executes a BUY directive
   */
  private async executeBuyDirective(directive: MindDirective): Promise<void> {
    if (!directive.amount) {
      console.error('❌ BUY directive missing amount');
      return;
    }
    
    console.log(`\n💰 Executing BUY: ${directive.amount.toFixed(4)} SOL`);
    console.log(`   Profile: ${directive.executionProfile.personality}`);
    
    // Select wallet based on execution profile
    const wallet = await this.walletManager.selectWallet(directive.executionProfile);
    
    // Check wallet cooldown
    const lastUsed = this.lastExecutionTime.get(wallet.publicKey.toString()) || 0;
    const cooldownMs = this.calculateWalletCooldown(directive.executionProfile);
    const timeSinceLastUse = Date.now() - lastUsed;
    
    if (timeSinceLastUse < cooldownMs) {
      const waitTime = cooldownMs - timeSinceLastUse;
      console.log(`⏳ Wallet cooldown: ${(waitTime / 1000).toFixed(1)}s remaining`);
      await this.sleep(waitTime);
    }
    
    // Apply execution variations based on profile
    const finalAmount = this.applyAmountVariation(directive.amount, directive.executionProfile);
    
    // Execute the trade
    const result = await executeBuy(
      directive.tokenAddress,
      finalAmount,
      wallet,
      this.connection,
      true // Skip MIND analysis since we already have the directive
    );
    
    if (result.success) {
      console.log(`✅ Buy executed successfully!`);
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Tokens received: ${result.tokensReceived?.toFixed(2)}`);
      
      // Update wallet last used time
      this.lastExecutionTime.set(wallet.publicKey.toString(), Date.now());
    } else {
      console.error(`❌ Buy failed: ${result.error}`);
    }
  }
  
  /**
   * Executes a SELL directive
   */
  private async executeSellDirective(directive: MindDirective): Promise<void> {
    console.log(`\n💸 Executing SELL directive`);
    console.log(`   Profile: ${directive.executionProfile.personality}`);
    
    // TODO: Implement sell logic when needed
    console.log('⚠️  Sell functionality not yet implemented');
  }
  
  /**
   * Calculates human-like execution delay based on profile
   */
  private calculateExecutionDelay(profile: ExecutionProfile): number {
    let baseDelay: number;
    
    // Load timing config from env
    const minInterval = parseInt(process.env.MIN_TRADE_INTERVAL_SECONDS || '45') * 1000;
    const maxInterval = parseInt(process.env.MAX_TRADE_INTERVAL_SECONDS || '180') * 1000;
    
    switch (profile.urgency) {
      case 'IMMEDIATE':
        baseDelay = randomInt(100, minInterval / 3); // Very fast
        break;
      case 'NORMAL':
        baseDelay = randomInt(minInterval, (minInterval + maxInterval) / 2); // Medium
        break;
      case 'PATIENT':
        baseDelay = randomInt((minInterval + maxInterval) / 2, maxInterval); // Slow
        break;
    }
    
    // Add personality-based variations
    switch (profile.personality) {
      case 'FOMO':
        baseDelay *= 0.5; // Faster execution
        break;
      case 'FEAR':
        baseDelay *= 0.7; // Somewhat faster
        break;
      case 'CONSERVATIVE':
        baseDelay *= 1.5; // Slower, more careful
        break;
    }
    
    return Math.floor(baseDelay);
  }
  
  /**
   * Calculates wallet cooldown based on profile
   */
  private calculateWalletCooldown(profile: ExecutionProfile): number {
    // Load cooldown config from env
    const minCooldown = parseInt(process.env.MIN_WALLET_COOLDOWN_MINUTES || '30') * 60 * 1000;
    
    let baseCooldown: number;
    
    switch (profile.stealth) {
      case 'LOUD':
        baseCooldown = randomInt(minCooldown, minCooldown * 2); // 30-60 minutes
        break;
      case 'NORMAL':
        baseCooldown = randomInt(minCooldown * 2, minCooldown * 4); // 60-120 minutes
        break;
      case 'SILENT':
        baseCooldown = randomInt(minCooldown * 4, minCooldown * 8); // 120-240 minutes
        break;
    }
    
    // Use exponential distribution for more natural timing
    const lambda = 1 / baseCooldown;
    const exponentialDelay = -Math.log(1 - Math.random()) / lambda;
    
    return Math.floor(exponentialDelay);
  }
  
  /**
   * Applies human-like variations to trade amounts
   */
  private applyAmountVariation(amount: number, profile: ExecutionProfile): number {
    let variationPercent: number;
    
    switch (profile.personality) {
      case 'AGGRESSIVE':
        variationPercent = randomInt(0, 20); // 0-20% more
        return amount * (1 + variationPercent / 100);
      case 'CONSERVATIVE':
        variationPercent = randomInt(0, 20); // 0-20% less
        return amount * (1 - variationPercent / 100);
      default:
        variationPercent = randomInt(-10, 10); // ±10%
        return amount * (1 + variationPercent / 100);
    }
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Get execution statistics
   */
  getStats(): {
    queueLength: number;
    isExecuting: boolean;
    walletsInCooldown: number;
    metrics: ContractMetrics;
  } {
    const now = Date.now();
    const walletsInCooldown = Array.from(this.lastExecutionTime.entries())
      .filter(([_, lastUsed]) => now - lastUsed < 600000) // 10 minute window
      .length;
    
    return {
      queueLength: this.executionQueue.length,
      isExecuting: this.isExecuting,
      walletsInCooldown,
      metrics: { ...this.metrics }
    };
  }
}