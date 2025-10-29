// HootBot/src/utils/distributionMonitor.ts
import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';
import chalk from 'chalk';

interface DexscreenerData {
  rank?: number;
  volume24h: number;
  priceChange24h: number;
  liquidity: number;
  txCount24h: number;
  holders: number;
}

interface DistributionStats {
  startDate: Date;
  currentWeek: number;
  holdingsPercent: number;
  targetPercent: number;
  progressPercent: number;
  totalProfitSOL: number;
  totalProfitUSD: number;
  volumeGenerated: number;
  avgDailyVolume: number;
  dexscreenerData?: DexscreenerData;
}

export class DistributionMonitor {
  private startTime: number;
  private initialHoldings = 113_200_000; // 113.2M tokens
  private targetHoldings = 55_000_000; // 55M tokens
  private solPrice = 190; // Current SOL price
  
  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Display real-time dashboard
   */
  async displayDashboard(metrics: any) {
    console.clear();
    
    // Header
    console.log(chalk.cyan.bold('\n🦉 $FATBEAR STRATEGIC DISTRIBUTION DASHBOARD'));
    console.log(chalk.gray('═'.repeat(60)));
    
    // Time and Progress
    const elapsed = Date.now() - this.startTime;
    const daysElapsed = Math.floor(elapsed / (24 * 60 * 60 * 1000));
    const currentWeek = Math.floor(daysElapsed / 7) + 1;
    
    console.log(chalk.white(`\n📅 Day ${daysElapsed + 1} | Week ${currentWeek}/3`));
    
    // Holdings Progress Bar
    const progressPercent = ((11.32 - metrics.currentSupplyPercent) / 5.82) * 100;
    this.drawProgressBar('Distribution Progress', progressPercent, 100);
    
    // Current Holdings
    console.log(chalk.yellow(`\n💼 Holdings: ${metrics.currentSupplyPercent.toFixed(2)}% → ${metrics.targetSupplyPercent}%`));
    
    // Profit Metrics
    console.log(chalk.green.bold('\n💰 Profit Metrics:'));
    console.log(chalk.green(`   SOL Earned: ${metrics.totalProfitSOL.toFixed(2)} SOL`));
    console.log(chalk.green(`   USD Value: $${metrics.totalProfitUSD.toFixed(0)}`));
    console.log(chalk.gray(`   Avg per Day: $${(metrics.totalProfitUSD / (daysElapsed + 1)).toFixed(0)}`));
    
    // Volume Metrics
    console.log(chalk.blue.bold('\n📊 Volume Metrics:'));
    console.log(chalk.blue(`   Total Generated: ${metrics.totalVolumeGenerated.toFixed(0)} SOL`));
    console.log(chalk.blue(`   24h Volume: ~${(metrics.totalVolumeGenerated / (daysElapsed + 1)).toFixed(0)} SOL`));
    
    // Transaction Breakdown
    console.log(chalk.magenta.bold('\n🔄 Transaction Breakdown:'));
    const total = metrics.transactions.churns + metrics.transactions.profitSells + metrics.transactions.supportBuys;
    console.log(chalk.magenta(`   Volume Churns: ${metrics.transactions.churns} (${(metrics.transactions.churns/total*100).toFixed(0)}%)`));
    console.log(chalk.magenta(`   Profit Sells: ${metrics.transactions.profitSells} (${(metrics.transactions.profitSells/total*100).toFixed(0)}%)`));
    console.log(chalk.magenta(`   Support Buys: ${metrics.transactions.supportBuys} (${(metrics.transactions.supportBuys/total*100).toFixed(0)}%)`));
    
    // Dexscreener Status
    if (metrics.dexscreenerRank) {
      console.log(chalk.yellow.bold(`\n🏆 Dexscreener Rank: #${metrics.dexscreenerRank}`));
      if (metrics.dexscreenerRank <= 100) {
        console.log(chalk.green('   ✅ TRENDING!'));
      }
    }
    
    // Projection
    this.displayProjections(metrics, daysElapsed);
    
    console.log(chalk.gray('\n' + '═'.repeat(60)));
    console.log(chalk.gray('Updated: ' + new Date().toLocaleString()));
  }

  /**
   * Draw ASCII progress bar
   */
  private drawProgressBar(label: string, current: number, max: number) {
    const width = 40;
    const percent = Math.min(current / max, 1);
    const filled = Math.floor(width * percent);
    const empty = width - filled;
    
    const bar = chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
    const percentStr = `${current.toFixed(1)}%`;
    
    console.log(`\n${chalk.white(label)}`);
    console.log(`[${bar}] ${percentStr}`);
  }

  /**
   * Display projections
   */
  private displayProjections(metrics: any, daysElapsed: number) {
    console.log(chalk.cyan.bold('\n📈 Projections:'));
    
    const daysRemaining = 21 - daysElapsed;
    const currentRate = metrics.totalProfitUSD / (daysElapsed + 1);
    const projectedTotal = metrics.totalProfitUSD + (currentRate * daysRemaining);
    
    console.log(chalk.cyan(`   Days Remaining: ${daysRemaining}`));
    console.log(chalk.cyan(`   Projected Total Profit: $${projectedTotal.toFixed(0)}`));
    console.log(chalk.cyan(`   Target Achievement: ${((11.32 - metrics.currentSupplyPercent) / 5.82 * 100).toFixed(1)}%`));
    
    // Success indicators
    if (metrics.currentSupplyPercent <= 8) {
      console.log(chalk.green(`   ✅ Below 8% - Major milestone!`));
    }
    if (metrics.totalProfitUSD > 1_000_000) {
      console.log(chalk.green(`   ✅ $1M+ profit milestone!`));
    }
  }

  /**
   * Get live Dexscreener data
   */
  async fetchDexscreenerData(tokenAddress: string): Promise<DexscreenerData | null> {
    try {
      const response = await axios.get(
        `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
      );
      
      if (response.data && response.data.pairs && response.data.pairs[0]) {
        const pair = response.data.pairs[0];
        return {
          volume24h: parseFloat(pair.volume.h24) || 0,
          priceChange24h: parseFloat(pair.priceChange.h24) || 0,
          liquidity: parseFloat(pair.liquidity.usd) || 0,
          txCount24h: pair.txns.h24.buys + pair.txns.h24.sells,
          holders: pair.holders || 0
        };
      }
    } catch (error) {
      console.error('Failed to fetch Dexscreener data:', error);
    }
    return null;
  }

  /**
   * Generate daily report
   */
  generateDailyReport(metrics: any): string {
    const report = `
📊 DAILY DISTRIBUTION REPORT
Date: ${new Date().toLocaleDateString()}
========================

HOLDINGS
Current: ${metrics.currentSupplyPercent.toFixed(2)}%
Target: ${metrics.targetSupplyPercent}%
Progress: ${((11.32 - metrics.currentSupplyPercent) / 5.82 * 100).toFixed(1)}%

PROFIT
Today: ${(metrics.totalProfitSOL / 10).toFixed(2)} SOL
Total: ${metrics.totalProfitSOL.toFixed(2)} SOL ($${metrics.totalProfitUSD.toFixed(0)})

VOLUME
24h: ${(metrics.totalVolumeGenerated / 10).toFixed(0)} SOL
Total: ${metrics.totalVolumeGenerated.toFixed(0)} SOL

TRANSACTIONS
Churns: ${metrics.transactions.churns}
Sells: ${metrics.transactions.profitSells}
Buys: ${metrics.transactions.supportBuys}

MARKET IMPACT
Price Change: +X%
New Holders: +X
Dexscreener Rank: #${metrics.dexscreenerRank || 'N/A'}
`;
    
    return report;
  }
}

// Usage in main bot
export function startMonitoring(metricsRef: any) {
  const monitor = new DistributionMonitor();
  
  // Update dashboard every 30 seconds
  setInterval(async () => {
    await monitor.displayDashboard(metricsRef);
  }, 30000);
  
  // Generate daily reports
  setInterval(() => {
    const report = monitor.generateDailyReport(metricsRef);
    console.log('\n' + chalk.yellow('📋 Daily Report Generated'));
    // Save to file or send to Discord/Telegram
  }, 24 * 60 * 60 * 1000); // Every 24 hours
  
  return monitor;
}