// HootBot/src/bots/volume/volumeMonitor.ts
import { getVolumeStats } from './volumeGenerator';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

export async function monitorVolume() {
  console.clear();
  console.log(`${colors.cyan}${colors.bright}🦉 HootBot Volume Monitor${colors.reset}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Get volume stats
    const stats = getVolumeStats();
    
    // Calculate metrics
    const avgTradeSize = stats.averageTradeSize || 0;
    const tradesPerHour = stats.tradesExecuted / (stats.uptime / 3600000);
    const projectedDaily = tradesPerHour * 24 * avgTradeSize;
    
    // Display stats
    console.log(`${colors.bright}📊 Trading Statistics${colors.reset}`);
    console.log(`Total Trades: ${colors.blue}${stats.tradesExecuted}${colors.reset}`);
    console.log(`Total Volume: ${colors.blue}${stats.totalVolume.toFixed(4)} SOL${colors.reset}`);
    console.log(`Daily Volume: ${colors.blue}${stats.dailyVolume.toFixed(4)} SOL${colors.reset}`);
    console.log(`Avg Trade Size: ${colors.blue}${avgTradeSize.toFixed(4)} SOL${colors.reset}\n`);
    
    console.log(`${colors.bright}📈 Performance Metrics${colors.reset}`);
    console.log(`Trades/Hour: ${colors.yellow}${tradesPerHour.toFixed(1)}${colors.reset}`);
    console.log(`Projected Daily: ${colors.yellow}${projectedDaily.toFixed(2)} SOL${colors.reset}\n`);
    
    // Wallet distribution
    if (stats.walletDistribution && stats.walletDistribution.length > 0) {
      console.log(`${colors.bright}💼 Wallet Distribution${colors.reset}`);
      stats.walletDistribution.forEach(w => {
        console.log(`${w.wallet}: ${w.trades} trades (${w.percentage.toFixed(1)}%)`);
      });
      console.log('');
    }
    
    // Last trade info
    const timeSinceLastTrade = Date.now() - stats.lastTradeTime;
    const minutesSinceLast = Math.floor(timeSinceLastTrade / 60000);
    console.log(`Last Trade: ${colors.cyan}${minutesSinceLast} minutes ago${colors.reset}\n`);
    
    // Status indicator
    if (minutesSinceLast > 20) {
      console.log(`${colors.red}⚠️  Bot may be stalled${colors.reset}`);
    } else if (stats.dailyVolume >= 1.0) {
      console.log(`${colors.green}✅ Daily target reached!${colors.reset}`);
    } else {
      console.log(`${colors.green}✅ Bot running normally${colors.reset}`);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Press Ctrl+C to exit monitor');
    
  } catch (error) {
    console.error(`${colors.red}Error reading stats:${colors.reset}`, error);
  }
}

// Update every 30 seconds
async function runMonitor() {
  while (true) {
    await monitorVolume();
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
}

// Run if called directly
if (require.main === module) {
  runMonitor().catch(console.error);
}
