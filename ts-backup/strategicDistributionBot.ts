// HootBot/src/bots/volume/strategicDistributionBot.ts
import { PublicKey, Connection, Keypair, Transaction } from '@solana/web3.js';
import { getHumanLikeDelay, getPoissonDelay } from '../../utils/timing';
import { secretsManager } from '../../utils/secretsManager';
import { executeJupiterSwap } from '../../utils/jupiterSwap';
import { loadDistributionWallets } from '../../utils/walletLoader';
import { rpcManager } from '../../utils/rpcManager';
import { FATBEAR_CONFIG } from '../../config/tokenConfig';

interface DistributionWallet {
  name: string;
  publicKey: PublicKey;
  keypair?: Keypair;
  category: 'whale' | 'dolphin' | 'fish';
  solBalance: number;
  tokenBalance: number;
  lastUsed: number;
  dailyVolume: number;
  profitTaken: number;
  tradesExecuted: number;
}

interface DistributionMetrics {
  startTime: number;
  week: number;
  initialSupplyPercent: 11.32;
  currentSupplyPercent: number;
  targetSupplyPercent: 5.5;
  totalDistributed: number;
  totalVolumeGenerated: number;
  totalProfitSOL: number;
  totalProfitUSD: number;
  transactions: {
    churns: number;
    profitSells: number;
    supportBuys: number;
  };
  dexscreenerRank?: number;
}

class StrategicDistributionBot {
  private wallets: DistributionWallet[] = [];
  private metrics: DistributionMetrics;
  private currentPrice: number = 0.046; // Starting price
  private readonly TOTAL_SUPPLY = 899_632_455.067375; // Updated for burn
  private readonly TARGET_DISTRIBUTION = 52_358_609; // Amount to distribute
  
  // Circuit breaker to prevent infinite loops
  private consecutiveFailures = 0;
  private readonly MAX_CONSECUTIVE_FAILURES = 5;
  
  // Weekly strategy configurations
  private weeklyStrategy = {
    1: {
      volumeTarget: { min: 300, max: 500 }, // SOL per day
      txTarget: { min: 200, max: 300 },
      distributionRate: 0.015, // 1.5% of holdings
      churnRatio: 0.7,
      profitRatio: 0.2,
      supportRatio: 0.1
    },
    2: {
      volumeTarget: { min: 400, max: 600 },
      txTarget: { min: 250, max: 350 },
      distributionRate: 0.025,
      churnRatio: 0.5,
      profitRatio: 0.4,
      supportRatio: 0.1
    },
    3: {
      volumeTarget: { min: 200, max: 400 },
      txTarget: { min: 150, max: 250 },
      distributionRate: 0.0182,
      churnRatio: 0.6,
      profitRatio: 0.3,
      supportRatio: 0.1
    }
  };

  constructor() {
    this.metrics = {
      startTime: Date.now(),
      week: 1,
      initialSupplyPercent: 11.32,
      currentSupplyPercent: 11.32,
      targetSupplyPercent: 5.5,
      totalDistributed: 0,
      totalVolumeGenerated: 0,
      totalProfitSOL: 0,
      totalProfitUSD: 0,
      transactions: {
        churns: 0,
        profitSells: 0,
        supportBuys: 0
      }
    };
  }

  async initialize() {
    console.log('🦉 $FATBEAR Strategic Distribution System v2.0');
    console.log('═'.repeat(50));
    console.log(`📊 Initial Holdings: ${this.metrics.initialSupplyPercent}% of supply`);
    console.log(`🎯 Target Holdings: ${this.metrics.targetSupplyPercent}% of supply`);
    console.log(`💰 Distribution: 52.36M tokens over 3 weeks`);
    console.log(`📈 Strategy: Volume Generation + Profit Taking`);
    console.log('═'.repeat(50));

    await this.loadWallets();
    await this.updateBalances();
    this.categorizeWallets();
    this.printWalletStatus();
  }

  /**
   * Main execution loop
   */
  async run() {
    console.log('\n🚀 Starting strategic distribution engine...\n');
    
    // Main execution loop
    while (this.getCurrentWeek() <= 3) {
      try {
        // Update current week and strategy
        this.updateWeeklyStrategy();
        
        // Execute next trade
        await this.executeNextTrade();
        
        // Update metrics
        await this.updateMetrics();
        
        // Check if we should continue
        if (this.metrics.currentSupplyPercent <= this.metrics.targetSupplyPercent) {
          console.log('\n🎯 Target reached! Distribution complete.');
          this.printFinalReport();
          break;
        }
        
        // Calculate next trade timing with minimum delay
        const delay = this.getNextTradeDelay();
        console.log(`\n⏰ Next trade in ${Math.round(delay / 1000)}s`);
        
        await this.sleep(delay);
      } catch (error) {
        console.error('❌ Error in main loop:', error);
        await this.sleep(60000); // Wait 1 minute on error
      }
    }
  }

  /**
   * Execute the next strategic trade
   */
  private async executeNextTrade() {
    const week = this.getCurrentWeek();
    const strategy = this.weeklyStrategy[week as keyof typeof this.weeklyStrategy];
    
    // Determine trade type based on ratios
    const rand = Math.random();
    let tradeType: 'churn' | 'profit' | 'support';
    
    if (rand < strategy.churnRatio) {
      tradeType = 'churn';
    } else if (rand < strategy.churnRatio + strategy.profitRatio) {
      tradeType = 'profit';
    } else {
      tradeType = 'support';
    }
    
    // Get current time for activity pattern
    const hour = new Date().getHours();
    const isPeakHours = (hour >= 9 && hour <= 11) || 
                       (hour >= 14 && hour <= 16) || 
                       (hour >= 19 && hour <= 21);
    
    // Adjust trade size based on time
    const sizeMultiplier = isPeakHours ? 1.5 : 1.0;
    
    let tradeExecuted = false;
    
    switch (tradeType) {
      case 'churn':
        tradeExecuted = await this.executeVolumeChurn(sizeMultiplier);
        break;
      case 'profit':
        tradeExecuted = await this.executeProfitTake(sizeMultiplier);
        break;
      case 'support':
        tradeExecuted = await this.executeSupportBuy(sizeMultiplier);
        break;
    }
    
    // Handle consecutive failures
    if (!tradeExecuted) {
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        console.log(`\n⚠️ Circuit breaker activated - ${this.consecutiveFailures} consecutive failures`);
        console.log(`⏸️ Pausing for 5 minutes to allow wallet cooldowns...`);
        this.consecutiveFailures = 0;
        
        // Force a 5-minute pause
        const delay = 5 * 60 * 1000;
        console.log(`\n⏰ Resuming at ${new Date(Date.now() + delay).toLocaleTimeString()}`);
        await this.sleep(delay);
      }
    } else {
      this.consecutiveFailures = 0; // Reset on successful trade
    }
  }

  /**
   * Execute volume churning trade
   */
  private async executeVolumeChurn(sizeMultiplier: number): Promise<boolean> {
    console.log('\n🔄 Executing Volume Churn...');
    
    // Select two different wallets
    const sellWallet = this.selectWallet('sell', 'any');
    if (!sellWallet) {
      console.log('⚠️ No wallet available for sell side of churn');
      return false;
    }
    
    const buyWallet = this.selectWallet('buy', 'any', [sellWallet.publicKey.toString()]);
    if (!buyWallet) {
      console.log('⚠️ No wallet available for buy side of churn');
      return false;
    }
    
    // Calculate trade size
    const baseSize = 0.1 + Math.random() * 0.2; // 0.1-0.3 SOL
    const tradeSize = baseSize * sizeMultiplier;
    
    // Execute sell
    console.log(`📉 Selling from ${sellWallet.name}`);
    console.log(`   Amount: ${tradeSize.toFixed(4)} SOL worth`);
    
    try {
      const sellResult = await this.executeTrade(sellWallet, 'sell', tradeSize);
      if (!sellResult.success) throw new Error('Sell failed');
      
      // Wait human-like delay
      const delay = 30000 + Math.random() * 90000; // 30s-2min
      console.log(`⏳ Waiting ${Math.round(delay/1000)}s before buy...`);
      await this.sleep(delay);
      
      // Execute buy with slightly less (simulate fees/slippage)
      const buySize = tradeSize * 0.98;
      console.log(`📈 Buying into ${buyWallet.name}`);
      console.log(`   Amount: ${buySize.toFixed(4)} SOL`);
      
      const buyResult = await this.executeTrade(buyWallet, 'buy', buySize);
      
      // Update metrics
      this.metrics.totalVolumeGenerated += tradeSize * 2;
      this.metrics.transactions.churns++;
      
      console.log(`✅ Churn complete: ${(tradeSize * 2).toFixed(3)} SOL volume generated`);
      return true;
    } catch (error) {
      console.error('❌ Churn failed:', error);
      return false;
    }
  }

  /**
   * Execute profit-taking sell
   */
  private async executeProfitTake(sizeMultiplier: number): Promise<boolean> {
    console.log('\n💰 Executing Profit Take...');
    
    // Select whale or dolphin wallet with most tokens
    const wallet = this.selectWallet('sell', 'largest');
    if (!wallet) {
      console.log('⚠️ No suitable wallet for profit taking');
      return false;
    }
    
    // Calculate trade size (larger for profit taking)
    const baseSize = 0.3 + Math.random() * 0.2; // 0.3-0.5 SOL worth
    const tradeSize = baseSize * sizeMultiplier;
    
    console.log(`📉 Taking profit from ${wallet.name} (${wallet.category})`);
    console.log(`   Current balance: ${(wallet.tokenBalance / 1e6).toFixed(2)}M $FATBEAR`);
    console.log(`   Selling: ${tradeSize.toFixed(4)} SOL worth`);
    
    try {
      const result = await this.executeTrade(wallet, 'sell', tradeSize);
      if (result.success) {
        const tokensDistributed = tradeSize / this.currentPrice * 1e6;
        
        // Update metrics
        this.metrics.totalDistributed += tokensDistributed;
        this.metrics.totalProfitSOL += tradeSize;
        this.metrics.totalProfitUSD += tradeSize * 190; // Assuming SOL = $190
        this.metrics.transactions.profitSells++;
        
        // Update supply percentage
        const percentDistributed = (this.metrics.totalDistributed / this.TARGET_DISTRIBUTION) * 100;
        this.metrics.currentSupplyPercent = 11.32 - (percentDistributed / 100 * 5.82);
        
        console.log(`✅ Profit taken: ${tradeSize.toFixed(4)} SOL ($${(tradeSize * 190).toFixed(2)})`);
        console.log(`📊 Progress: ${percentDistributed.toFixed(1)}% distributed`);
        return true;
      }
    } catch (error) {
      console.error('❌ Profit take failed:', error);
    }
    return false;
  }

  /**
   * Execute support buy
   */
  private async executeSupportBuy(sizeMultiplier: number): Promise<boolean> {
    console.log('\n🛡️ Executing Support Buy...');
    
    // Select smaller wallet for buying
    const wallet = this.selectWallet('buy', 'smallest');
    if (!wallet) {
      console.log('⚠️ No suitable wallet for support buy');
      return false;
    }
    
    // Smaller size for support buys
    const baseSize = 0.05 + Math.random() * 0.1; // 0.05-0.15 SOL
    const tradeSize = baseSize * sizeMultiplier;
    
    console.log(`📈 Support buy with ${wallet.name}`);
    console.log(`   Amount: ${tradeSize.toFixed(4)} SOL`);
    
    try {
      const result = await this.executeTrade(wallet, 'buy', tradeSize);
      if (result.success) {
        this.metrics.transactions.supportBuys++;
        console.log(`✅ Support provided: ${tradeSize.toFixed(4)} SOL`);
        return true;
      }
    } catch (error) {
      console.error('❌ Support buy failed:', error);
    }
    return false;
  }

  /**
   * Execute actual trade using Jupiter
   */
  private async executeTrade(
    wallet: DistributionWallet,
    type: 'buy' | 'sell',
    amountSOL: number
  ): Promise<{ success: boolean; signature?: string }> {
    if (!wallet.keypair) {
      console.error('❌ Wallet keypair not available for trading');
      return { success: false };
    }
    
    console.log(`🔄 Executing REAL ${type} on Jupiter...`);
    
    try {
      // Execute real trade through Jupiter
      const result = await executeJupiterSwap(
        wallet.keypair,
        type,
        amountSOL
      );
      
      if (result.success && result.signature) {
        // Update wallet stats on successful trade
        wallet.lastUsed = Date.now();
        wallet.dailyVolume += amountSOL;
        wallet.tradesExecuted++;
        
        if (type === 'sell') {
          const tokenAmount = result.inAmount ? result.inAmount / 1e6 : 0;
          wallet.tokenBalance = Math.max(0, wallet.tokenBalance - tokenAmount);
          wallet.solBalance += (result.outAmount || 0) / 1e9;
          wallet.profitTaken += (result.outAmount || 0) / 1e9;
        } else {
          wallet.tokenBalance += (result.outAmount || 0) / 1e6;
          wallet.solBalance = Math.max(0, wallet.solBalance - amountSOL);
        }
        
        // Update price based on actual trade
        if (result.priceImpact) {
          this.currentPrice *= (1 - result.priceImpact / 100);
        }
        
        console.log(`✅ Trade executed: ${result.signature}`);
        console.log(`🔗 View on Solscan: https://solscan.io/tx/${result.signature}`);
        
        return { success: true, signature: result.signature };
      } else {
        console.error(`❌ Trade failed: ${result.error || 'Unknown error'}`);
        return { success: false };
      }
    } catch (error: any) {
      console.error(`❌ Trade execution error:`, error.message);
      return { success: false };
    }
  }

  /**
   * Select wallet based on criteria with better logging
   */
  private selectWallet(
    purpose: 'buy' | 'sell',
    preference: 'largest' | 'smallest' | 'any',
    exclude: string[] = []
  ): DistributionWallet | null {
    const now = Date.now();
    const cooldown = 10 * 60 * 1000; // 10 minutes for better testing
    
    // Debug: Show wallet status
    console.log(`\n🔍 Wallet availability check for ${purpose}:`);
    
    let candidates = this.wallets.filter(w => {
      const timeSinceLastUse = now - w.lastUsed;
      const cooldownRemaining = Math.max(0, cooldown - timeSinceLastUse);
      
      // Log each wallet's status
      const status = cooldownRemaining > 0 
        ? `❌ Cooldown: ${Math.round(cooldownRemaining/60000)}min` 
        : '✅ Available';
      console.log(`   ${w.name}: ${status} | SOL: ${w.solBalance.toFixed(3)} | Tokens: ${(w.tokenBalance/1e6).toFixed(1)}M`);
      
      // Basic filters
      if (exclude.includes(w.publicKey.toString())) return false;
      if (now - w.lastUsed < cooldown) return false;
      
      // Purpose-specific filters
      if (purpose === 'sell' && w.tokenBalance < 1_000_000) return false; // Min 1M tokens
      if (purpose === 'buy' && w.solBalance < 0.1) return false; // Min 0.1 SOL
      
      return true;
    });
    
    if (candidates.length === 0) {
      console.log(`   ⚠️ No wallets available - all on cooldown or insufficient balance`);
      return null;
    }
    
    // Apply preference
    switch (preference) {
      case 'largest':
        candidates.sort((a, b) => b.tokenBalance - a.tokenBalance);
        break;
      case 'smallest':
        candidates.sort((a, b) => a.tokenBalance - b.tokenBalance);
        break;
      case 'any':
        // Prefer least recently used
        candidates.sort((a, b) => a.lastUsed - b.lastUsed);
        break;
    }
    
    const selected = candidates[0];
    console.log(`   ✅ Selected: ${selected.name}`);
    return selected;
  }

  /**
   * Get next trade delay based on current strategy with minimum safeguard
   */
  private getNextTradeDelay(): number {
    const hour = new Date().getHours();
    
    let baseDelay: number;
    
    // More frequent during peak hours
    if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16)) {
      baseDelay = getPoissonDelay(1 / (5 * 60 * 1000)); // ~5 min average
    } else if (hour >= 0 && hour <= 6) {
      // Quiet during night
      baseDelay = getPoissonDelay(1 / (30 * 60 * 1000)); // ~30 min average
    } else {
      // Normal hours
      baseDelay = getPoissonDelay(1 / (10 * 60 * 1000)); // ~10 min average
    }
    
    // CRITICAL: Ensure minimum delay of 30 seconds to prevent infinite loops
    return Math.max(baseDelay, 30000);
  }

  /**
   * Load wallets from configuration
   */
  private async loadWallets() {
    console.log('\n💼 Loading distribution wallets...');
    
    try {
      this.wallets = await loadDistributionWallets();
      console.log(`✅ Successfully loaded ${this.wallets.length} wallets`);
    } catch (error) {
      console.error('❌ Failed to load wallets:', error);
      throw error;
    }
  }

  /**
   * Update all wallet balances
   */
  private async updateBalances() {
    console.log('\n📊 Updating wallet balances...');
    
    for (const wallet of this.wallets) {
      try {
        // Get SOL balance
        const balance = await rpcManager.executeRequest(async (connection) => {
          return await connection.getBalance(wallet.publicKey);
        });
        
        wallet.solBalance = balance / 1e9;
        
        // Mock token balance for now
        if (wallet.category === 'whale') {
          wallet.tokenBalance = 35_000_000 + Math.random() * 5_000_000;
        } else if (wallet.category === 'dolphin') {
          wallet.tokenBalance = 10_000_000 + Math.random() * 5_000_000;
        } else {
          wallet.tokenBalance = 2_000_000 + Math.random() * 1_000_000;
        }
        
        console.log(`   ${wallet.name}: ${wallet.solBalance.toFixed(2)} SOL, ${(wallet.tokenBalance / 1e6).toFixed(2)}M $FATBEAR`);
      } catch (error) {
        console.error(`   ❌ Failed to update ${wallet.name}:`, error);
      }
    }
  }

  /**
   * Categorize wallets and show distribution
   */
  private categorizeWallets() {
    const categories = { whale: 0, dolphin: 0, fish: 0 };
    const totalTokens = this.wallets.reduce((sum, w) => sum + w.tokenBalance, 0);
    
    console.log('\n🐋 Wallet Distribution:');
    this.wallets.forEach(w => {
      categories[w.category]++;
      const percent = (w.tokenBalance / totalTokens * 100).toFixed(2);
      console.log(`   ${w.name}: ${percent}% of cluster holdings`);
    });
  }

  /**
   * Get current week number
   */
  private getCurrentWeek(): number {
    const elapsed = Date.now() - this.metrics.startTime;
    const weekNumber = Math.floor(elapsed / (7 * 24 * 60 * 60 * 1000)) + 1;
    return Math.min(weekNumber, 3);
  }

  /**
   * Update strategy based on current week
   */
  private updateWeeklyStrategy() {
    const newWeek = this.getCurrentWeek();
    if (newWeek !== this.metrics.week) {
      this.metrics.week = newWeek;
      console.log(`\n📅 Entering Week ${newWeek} - Adjusting strategy`);
      
      const strategy = this.weeklyStrategy[newWeek as keyof typeof this.weeklyStrategy];
      console.log(`   Volume target: ${strategy.volumeTarget.min}-${strategy.volumeTarget.max} SOL/day`);
      console.log(`   Distribution rate: ${(strategy.distributionRate * 100).toFixed(1)}%`);
      console.log(`   Profit/Churn ratio: ${strategy.profitRatio}/${strategy.churnRatio}`);
    }
  }

  /**
   * Update metrics and print progress
   */
  private async updateMetrics() {
    // Check Dexscreener ranking (simulated)
    if (this.metrics.totalVolumeGenerated > 250) {
      this.metrics.dexscreenerRank = Math.max(50, 150 - Math.floor(this.metrics.totalVolumeGenerated / 10));
    }
    
    // Print hourly summary
    const hour = new Date().getHours();
    if (new Date().getMinutes() === 0) {
      this.printHourlySummary();
    }
  }

  /**
   * Print current wallet status
   */
  private printWalletStatus() {
    console.log('\n📊 Wallet Status:');
    const totalTokens = this.wallets.reduce((sum, w) => sum + w.tokenBalance, 0);
    const totalSOL = this.wallets.reduce((sum, w) => sum + w.solBalance, 0);
    
    console.log(`   Total Holdings: ${(totalTokens / 1e6).toFixed(2)}M $FATBEAR`);
    console.log(`   Total SOL: ${totalSOL.toFixed(2)} SOL`);
    console.log(`   Current Price: $${this.currentPrice.toFixed(4)}`);
    console.log(`   Holdings Value: $${(totalTokens * this.currentPrice / 1e6).toFixed(0)}`);
  }

  /**
   * Print hourly summary
   */
  private printHourlySummary() {
    console.log('\n' + '═'.repeat(50));
    console.log(`📊 Hourly Report - Week ${this.metrics.week}`);
    console.log('═'.repeat(50));
    console.log(`🏆 Current Holdings: ${this.metrics.currentSupplyPercent.toFixed(2)}%`);
    console.log(`📈 Progress: ${((11.32 - this.metrics.currentSupplyPercent) / 5.82 * 100).toFixed(1)}%`);
    console.log(`💰 Profit Taken: ${this.metrics.totalProfitSOL.toFixed(2)} SOL ($${this.metrics.totalProfitUSD.toFixed(0)})`);
    console.log(`📊 Volume Generated: ${this.metrics.totalVolumeGenerated.toFixed(2)} SOL`);
    
    if (this.metrics.dexscreenerRank) {
      console.log(`🏅 Dexscreener Rank: #${this.metrics.dexscreenerRank}`);
    }
    
    console.log(`\n📊 Transaction Breakdown:`);
    console.log(`   Volume Churns: ${this.metrics.transactions.churns}`);
    console.log(`   Profit Sells: ${this.metrics.transactions.profitSells}`);
    console.log(`   Support Buys: ${this.metrics.transactions.supportBuys}`);
  }

  /**
   * Print final report
   */
  private printFinalReport() {
    console.log('\n' + '🎉'.repeat(25));
    console.log('\n🏆 DISTRIBUTION COMPLETE - FINAL REPORT');
    console.log('═'.repeat(50));
    console.log(`📊 Holdings Reduced: ${this.metrics.initialSupplyPercent}% → ${this.metrics.currentSupplyPercent.toFixed(2)}%`);
    console.log(`💰 Total Profit: ${this.metrics.totalProfitSOL.toFixed(2)} SOL ($${this.metrics.totalProfitUSD.toFixed(0)})`);
    console.log(`📈 Tokens Distributed: ${(this.metrics.totalDistributed / 1e6).toFixed(2)}M`);
    console.log(`🔄 Volume Generated: ${this.metrics.totalVolumeGenerated.toFixed(2)} SOL`);
    console.log(`📊 Total Transactions: ${Object.values(this.metrics.transactions).reduce((a, b) => a + b)}`);
    
    console.log(`\n💼 Business Impact:`);
    console.log(`   ✅ Reduced concentration risk by ${(11.32 - this.metrics.currentSupplyPercent).toFixed(2)}%`);
    console.log(`   ✅ Generated $${this.metrics.totalProfitUSD.toFixed(0)} for operations`);
    console.log(`   ✅ Created sustainable trading volume`);
    console.log(`   ✅ Improved holder distribution`);
    
    console.log('\n' + '🎉'.repeat(25));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize and run
async function main() {
  const bot = new StrategicDistributionBot();
  
  try {
    await bot.initialize();
    
    console.log('\n⚠️  READY TO START DISTRIBUTION ⚠️');
    console.log('This will execute real trades over 3 weeks.');
    console.log('Press Ctrl+C to abort.\n');
    
    // Give time to review
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await bot.run();
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Start the bot
if (require.main === module) {
  main().catch(console.error);
}

export { StrategicDistributionBot };