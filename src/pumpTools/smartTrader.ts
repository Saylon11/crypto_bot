// smartTrader.ts - HootBot Advanced Trading with Fixed MIND Integration
import { scanAllTokens } from './tokenScanner';
import { runMindEngine } from '../mindEngine';
import { initiateCoordinatedBuy } from './tradeExecutor';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import * as dotenv from 'dotenv';

dotenv.config();

// Types
interface MindResult {
  survivabilityScore: number;
  tradeSuggestion?: {
    action: string;
    percentage?: number;
    reason?: string;
  };
  suggestedAction?: string; // Fallback field
  riskLevel?: string;
  marketFlowStrength?: number;
  panicScore?: number;
  whaleActivity?: boolean;
  volumeTrend?: string;
  devExhaustion?: {
    exhausted: boolean;
    remainingPercentage: number;
  };
  consumerProfile?: {
    shrimpPercent: number;
    dolphinPercent: number;
    whalePercent: number;
  };
  peakTradingHours?: number[];
}

interface TokenInfo {
  mint: string;
  symbol: string;
  source: string;
  score: number;
}

interface TradedToken {
  symbol: string;
  buyPrice: number;
  amount: number;
  timestamp: number;
  mindScore: number;
}

// Configuration
const config = {
  // Scanner settings
  scanNewTokens: true,
  scanInterval: 5,  // Scan every N trading cycles
  
  // Trading settings
  primaryToken: process.env.DUTCHBROS_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS || '',
  walletAddress: process.env.HOOTBOT_WALLET_ADDRESS || '3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D',
  baseTradeAmount: 0.01,  // Base SOL per trade
  maxTradeAmount: 0.5,    // Maximum SOL per trade
  minMindScore: 60,       // Minimum MIND survivability
  
  // Timing
  cycleDelay: 3 * 60 * 1000,  // 3 minutes between cycles
  peakHourMultiplier: 1.5,    // Increase trades during peak hours
  
  // Risk management
  maxNewTokens: 2,           // Max new tokens to try per session
  maxDailySpend: 5,          // Maximum SOL to spend per day
  panicSellThreshold: 50,    // Panic score threshold
  stopLossPercentage: 25,    // Stop loss at 25% down
  
  // Modes
  testMode: true,            // Set false to execute real trades
  whaleMode: false,          // Enable whale-sized trades
  conservativeMode: false,   // Only trade on very strong signals
  verboseLogging: true,      // Detailed logging
};

// Session tracking
let cycleCount = 0;
const tradedTokens = new Map<string, TradedToken>();
const sessionStats = {
  totalBuys: 0,
  totalSells: 0,
  totalSpent: 0,
  totalEarned: 0,
  tokensAnalyzed: 0,
  tradesExecuted: 0,
  startTime: Date.now(),
  dailySpent: 0,
  lastDayReset: new Date().toDateString()
};

// Helper function to check if we're in peak trading hours
function isPeakTradingHour(peakHours?: number[]): boolean {
  if (!peakHours || peakHours.length === 0) return false;
  const currentHour = new Date().getUTCHours();
  return peakHours.includes(currentHour);
}

// Helper function to extract MIND action (fixing the bug)
function extractMindAction(mindResult: MindResult): string {
  // Check multiple possible locations for the action
  if (mindResult.tradeSuggestion?.action) {
    return mindResult.tradeSuggestion.action;
  }
  
  // Check if suggestedAction exists (fallback)
  if (mindResult.suggestedAction) {
    // Parse if it's in format "BUY (25%)"
    const match = mindResult.suggestedAction.match(/^(\w+)/);
    return match ? match[1] : 'HOLD';
  }
  
  // Default to HOLD if no action found
  return 'HOLD';
}

// Helper function to calculate dynamic trade size based on MIND analysis
function calculateTradeSize(mindResult: MindResult, baseAmount: number): number {
  let size = baseAmount;
  
  // Apply MIND's suggested percentage
  const suggestedPercentage = mindResult.tradeSuggestion?.percentage || 25;
  size = size * (suggestedPercentage / 100);
  
  // Apply multipliers based on conditions
  if (mindResult.whaleActivity) {
    size *= 2; // Double size if whales are buying
    console.log('🐋 Whale activity detected - 2x multiplier applied');
  }
  
  if (isPeakTradingHour(mindResult.peakTradingHours)) {
    size *= config.peakHourMultiplier;
    console.log('⏰ Peak trading hour - 1.5x multiplier applied');
  }
  
  if (mindResult.riskLevel === 'low' && mindResult.survivabilityScore > 85) {
    size *= 1.5;
    console.log('✨ Low risk + high survivability - 1.5x multiplier applied');
  }
  
  if (config.conservativeMode && mindResult.riskLevel !== 'low') {
    size *= 0.5;
    console.log('🛡️ Conservative mode - 0.5x multiplier applied');
  }
  
  // Ensure we don't exceed max trade amount
  return Math.min(size, config.maxTradeAmount);
}

// Check wallet balance
async function checkWalletBalance(): Promise<number> {
  try {
    const connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    const pubkey = new PublicKey(config.walletAddress);
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    return solBalance;
  } catch (error) {
    console.error('Could not check wallet balance:', (error as Error).message);
    return 0;
  }
}

// Reset daily spending limit
function checkDailyReset(): void {
  const today = new Date().toDateString();
  if (today !== sessionStats.lastDayReset) {
    sessionStats.dailySpent = 0;
    sessionStats.lastDayReset = today;
    console.log('📅 Daily spending limit reset');
  }
}

// Main trading cycle
async function smartTradingCycle(): Promise<void> {
  cycleCount++;
  const cycleStartTime = Date.now();
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🤖 Smart Trading Cycle #${cycleCount}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log(`💰 Daily spent: ${sessionStats.dailySpent.toFixed(3)}/${config.maxDailySpend} SOL`);
  console.log('─'.repeat(60));
  
  checkDailyReset();
  
  try {
    // Check if we've hit daily limit
    if (sessionStats.dailySpent >= config.maxDailySpend) {
      console.log('📛 Daily spending limit reached. Waiting for reset...');
      return;
    }
    
    // 1. Scan for new opportunities periodically
    if (config.scanNewTokens && cycleCount % config.scanInterval === 0) {
      console.log('\n🔍 Scanning for new token opportunities...');
      
      const tokens = await scanAllTokens() as TokenInfo[];
      const newTokens = tokens.filter(t => !tradedTokens.has(t.mint));
      
      if (newTokens.length > 0) {
        console.log(`\n✨ Found ${newTokens.length} new tokens to analyze`);
        sessionStats.tokensAnalyzed += newTokens.length;
        
        // Analyze top new tokens (limit to maxNewTokens)
        const tokensToAnalyze = newTokens.slice(0, config.maxNewTokens);
        
        for (const candidate of tokensToAnalyze) {
          if (tradedTokens.size >= config.maxNewTokens) {
            console.log('📋 Max new tokens limit reached for this session');
            break;
          }
          
          console.log(`\n🔬 Analyzing ${candidate.symbol} (${candidate.source})...`);
          console.log(`   Scanner Score: ${candidate.score}/100`);
          
          // Temporarily switch to analyze this token
          const originalToken = process.env.DUTCHBROS_TOKEN_MINT;
          process.env.DUTCHBROS_TOKEN_MINT = candidate.mint;
          process.env.HELIUS_TARGET_WALLET = candidate.mint;
          
          try {
            const mindResult = await runMindEngine() as MindResult;
            
            console.log(`\n📊 MIND Analysis for ${candidate.symbol}:`);
            console.log(`   Survivability: ${mindResult.survivabilityScore}%`);
            console.log(`   Action: ${extractMindAction(mindResult)}`);
            console.log(`   Risk Level: ${mindResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
            console.log(`   Reason: ${mindResult.tradeSuggestion?.reason || 'No reason provided'}`);
            
            const recommendation = extractMindAction(mindResult);
            
            if (recommendation === 'BUY' && 
                mindResult.survivabilityScore >= config.minMindScore &&
                mindResult.riskLevel !== 'critical') {
              
              console.log(`\n✅ ${candidate.symbol} APPROVED BY MIND!`);
              
              const tradeSize = calculateTradeSize(mindResult, config.baseTradeAmount);
              
              if (!config.testMode && sessionStats.dailySpent + tradeSize <= config.maxDailySpend) {
                console.log(`💸 Executing buy: ${tradeSize.toFixed(3)} SOL`);
                
                try {
                  await initiateCoordinatedBuy(tradeSize);
                  
                  tradedTokens.set(candidate.mint, {
                    symbol: candidate.symbol,
                    buyPrice: tradeSize,
                    amount: 0,
                    timestamp: Date.now(),
                    mindScore: mindResult.survivabilityScore
                  });
                  
                  sessionStats.tradesExecuted++;
                  sessionStats.totalBuys++;
                  sessionStats.totalSpent += tradeSize;
                  sessionStats.dailySpent += tradeSize;
                  
                  console.log(`✅ Purchase successful!`);
                  console.log(`🔗 Track at: https://dexscreener.com/solana/${candidate.mint}`);
                } catch (error) {
                  console.error(`❌ Trade execution failed:`, (error as Error).message);
                }
              } else if (config.testMode) {
                console.log(`\n🧪 TEST MODE: Would buy ${tradeSize.toFixed(3)} SOL of ${candidate.symbol}`);
              } else {
                console.log(`\n⚠️ Skipping - would exceed daily limit`);
              }
            } else {
              console.log(`\n❌ ${candidate.symbol} rejected by MIND`);
              if (mindResult.riskLevel === 'critical') {
                console.log(`   🚨 CRITICAL RISK DETECTED`);
              }
            }
          } catch (error) {
            console.error(`Error analyzing ${candidate.symbol}:`, (error as Error).message);
          } finally {
            // Restore primary token
            process.env.DUTCHBROS_TOKEN_MINT = originalToken;
            process.env.HELIUS_TARGET_WALLET = originalToken;
          }
        }
      } else {
        console.log('No new tokens found this cycle');
      }
    }
    
    // 2. Always analyze and trade primary token
    console.log(`\n💎 Analyzing primary token...`);
    console.log(`   Token: ${config.primaryToken.slice(0, 8)}...${config.primaryToken.slice(-4)}`);
    
    const primaryResult = await runMindEngine() as MindResult;
    
    // Display full MIND analysis
    console.log(`\n🧠 MIND Analysis Results:`);
    console.log(`   Survivability: ${primaryResult.survivabilityScore}%`);
    console.log(`   Action: ${extractMindAction(primaryResult)}`);
    console.log(`   Suggested Size: ${primaryResult.tradeSuggestion?.percentage || 0}%`);
    console.log(`   Risk Level: ${primaryResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`   Market Flow: ${primaryResult.marketFlowStrength || 0}%`);
    console.log(`   Panic Score: ${primaryResult.panicScore || 0}%`);
    console.log(`   Whale Activity: ${primaryResult.whaleActivity ? '🐋 DETECTED' : 'None'}`);
    console.log(`   Volume Trend: ${primaryResult.volumeTrend?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`   Dev Exhaustion: ${primaryResult.devExhaustion?.exhausted ? '✅ Exhausted' : `${primaryResult.devExhaustion?.remainingPercentage || 100}% remaining`}`);
    console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'No reason provided'}`);
    
    // Display consumer profile
    if (primaryResult.consumerProfile) {
      console.log(`\n👥 Consumer Profile:`);
      console.log(`   🦐 Shrimps: ${primaryResult.consumerProfile.shrimpPercent.toFixed(1)}%`);
      console.log(`   🐬 Dolphins: ${primaryResult.consumerProfile.dolphinPercent.toFixed(1)}%`);
      console.log(`   🐋 Whales: ${primaryResult.consumerProfile.whalePercent.toFixed(1)}%`);
    }
    
    // Display peak hours if available
    if (primaryResult.peakTradingHours && primaryResult.peakTradingHours.length > 0) {
      console.log(`\n⏰ Peak Trading Hours (UTC): ${primaryResult.peakTradingHours.join(', ')}`);
      if (isPeakTradingHour(primaryResult.peakTradingHours)) {
        console.log(`   🔥 CURRENTLY IN PEAK HOUR!`);
      }
    }
    
    // Get the action from MIND
    const mindAction = extractMindAction(primaryResult);
    
    if (config.verboseLogging) {
      console.log(`\n🔍 Debug: MIND recommends ${mindAction}`);
      console.log(`   Raw suggestedAction:`, primaryResult.suggestedAction);
    }
    
    // Execute trade based on MIND recommendation
    switch (mindAction) {
      case 'BUY':
        const buySize = calculateTradeSize(primaryResult, config.baseTradeAmount);
        
        console.log(`\n🎯 MIND says BUY!`);
        
        if (!config.testMode && sessionStats.dailySpent + buySize <= config.maxDailySpend) {
          console.log(`💸 Executing BUY: ${buySize.toFixed(3)} SOL`);
          
          try {
            await initiateCoordinatedBuy(buySize);
            sessionStats.tradesExecuted++;
            sessionStats.totalBuys++;
            sessionStats.totalSpent += buySize;
            sessionStats.dailySpent += buySize;
            console.log('✅ Buy order executed successfully');
          } catch (error) {
            console.error('❌ Buy execution failed:', (error as Error).message);
          }
        } else if (config.testMode) {
          console.log(`🧪 TEST MODE: Would buy ${buySize.toFixed(3)} SOL`);
          console.log(`   Base amount: ${config.baseTradeAmount} SOL`);
          console.log(`   MIND suggested: ${primaryResult.tradeSuggestion?.percentage || 25}%`);
          console.log(`   Final size: ${buySize.toFixed(3)} SOL`);
        } else {
          console.log(`⚠️ Buy skipped - would exceed daily limit`);
        }
        break;
        
      case 'HOLD':
        console.log('\n⏸️  HOLDING - Maintaining current position');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Waiting for better signals'}`);
        break;
        
      case 'PAUSE':
        console.log('\n⏳ PAUSING - Market conditions unclear');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Waiting for market clarity'}`);
        break;
        
      case 'SELL':
        console.log(`\n�� SELL Signal: ${primaryResult.tradeSuggestion?.percentage || 50}% of position`);
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Risk increasing'}`);
        if (!config.testMode) {
          console.log('⚠️  Sell functionality not yet implemented');
        } else {
          console.log('🧪 TEST MODE: Would sell here');
        }
        break;
        
      case 'EXIT':
        console.log('\n🚨 EXIT SIGNAL - Critical risk detected!');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'High risk conditions'}`);
        if (primaryResult.panicScore && primaryResult.panicScore > config.panicSellThreshold) {
          console.log(`   🔴 PANIC LEVEL: ${primaryResult.panicScore}%`);
        }
        break;
        
      default:
        console.log(`\n❓ Unknown action: ${mindAction}`);
        console.log('   Defaulting to HOLD');
    }
    
    // Check wallet balance periodically
    if (cycleCount % 10 === 0) {
      const balance = await checkWalletBalance();
      console.log(`\n💰 Wallet Balance: ${balance.toFixed(4)} SOL`);
      
      if (balance < 0.1) {
        console.log('⚠️  WARNING: Low wallet balance!');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Cycle error:', (error as Error).message);
    if (config.verboseLogging) {
      console.error('Stack:', (error as Error).stack);
    }
  }
  
  // Show session statistics
  const sessionDuration = (Date.now() - sessionStats.startTime) / 1000 / 60; // minutes
  console.log(`\n📊 Session Statistics:`);
  console.log(`   Duration: ${sessionDuration.toFixed(1)} minutes`);
  console.log(`   Cycles Run: ${cycleCount}`);
  console.log(`   Tokens Analyzed: ${sessionStats.tokensAnalyzed}`);
  console.log(`   Trades Executed: ${sessionStats.tradesExecuted}`);
  console.log(`   Total Spent: ${sessionStats.totalSpent.toFixed(4)} SOL`);
  console.log(`   Active Positions: ${tradedTokens.size}`);
  
  const cycleTime = Date.now() - cycleStartTime;
  console.log(`\n⏱️  Cycle completed in ${(cycleTime / 1000).toFixed(1)} seconds`);
  console.log(`⏰ Next cycle in ${(config.cycleDelay / 60000).toFixed(1)} minutes`);
}

// Main function
async function main(): Promise<void> {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       🦉 HootBot Smart Trader v2.0 - Full MIND Edition   ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Configuration:');
  console.log(`   Primary Token: ${config.primaryToken}`);
  console.log(`   Wallet: ${config.walletAddress}`);
  console.log(`   Mode: ${config.testMode ? '🧪 TEST MODE' : '💰 LIVE TRADING'}`);
  console.log(`   Scanner: ${config.scanNewTokens ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   Base Trade Size: ${config.baseTradeAmount} SOL`);
  console.log(`   Max Trade Size: ${config.maxTradeAmount} SOL`);
  console.log(`   Daily Limit: ${config.maxDailySpend} SOL`);
  console.log(`   Min MIND Score: ${config.minMindScore}%`);
  console.log(`   Conservative Mode: ${config.conservativeMode ? 'ON' : 'OFF'}`);
  console.log(`   Verbose Logging: ${config.verboseLogging ? 'ON' : 'OFF'}`);
  
  // Check initial wallet balance
  const initialBalance = await checkWalletBalance();
  console.log(`\n💰 Starting Balance: ${initialBalance.toFixed(4)} SOL`);
  
  if (!config.testMode && initialBalance < 0.1) {
    console.log('\n❌ Insufficient balance for trading. Please fund your wallet.');
    process.exit(1);
  }
  
  console.log('\n🚀 Starting trading cycles...\n');
  
  // Main trading loop
  while (true) {
    await smartTradingCycle();
    console.log('\n' + '═'.repeat(60) + '\n');
    
    // Wait for next cycle
    await new Promise(resolve => setTimeout(resolve, config.cycleDelay));
  }
}

// Graceful shutdown handler
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  console.log('📊 Final Session Summary:');
  console.log(`   Total Cycles: ${cycleCount}`);
  console.log(`   Tokens Discovered: ${tradedTokens.size}`);
  console.log(`   Total Trades: ${sessionStats.tradesExecuted}`);
  console.log(`   Total Spent: ${sessionStats.totalSpent.toFixed(4)} SOL`);
  console.log(`   Session Duration: ${((Date.now() - sessionStats.startTime) / 1000 / 60).toFixed(1)} minutes`);
  
  if (tradedTokens.size > 0) {
    console.log('\n📈 Active Positions:');
    for (const [mint, data] of tradedTokens.entries()) {
      console.log(`   ${data.symbol}: ${data.buyPrice.toFixed(3)} SOL (MIND Score: ${data.mindScore}%)`);
    }
  }
  
  console.log('\n✨ Thanks for using HootBot! 🦉');
  process.exit(0);
});

// Start the trader
if (require.main === module) {
  main().catch((error: Error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

export { main as startSmartTrader };
