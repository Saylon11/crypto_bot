// HootBot/src/enhancedSmartTrader.js
// Enhanced SmartTrader with Rapid Risk Detection Integration
// Replaces your existing smartTrader.js

const { scanAllTokens } = require('./dist/pumpTools/tokenScanner');
const { runMindEngine } = require('./dist/mindEngine');
const { initiateCoordinatedBuy } = require('./dist/pumpTools/tradeExecutor');
const { initiateCoordinatedSell, getTokenBalance, smartProfitTake, emergencyExitPosition } = require('./dist/pumpTools/sellExecutor');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const RealTimeRiskMonitor = require('../realTimeRiskMonitor').default;
const { ProfitSniper } = require('../profitSniper');
const dotenv = require('dotenv');

dotenv.config();

// Enhanced configuration with rapid monitoring
const config = {
  // Scanner settings
  scanNewTokens: true,
  scanInterval: 1,  // Scan EVERY cycle for maximum opportunity discovery
  
  // Trading settings
  primaryToken: process.env.TARGET_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS,
  walletAddress: process.env.HOOTBOT_WALLET_ADDRESS || '3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D',
  baseTradeAmount: 0.01,  // Base SOL per trade
  maxTradeAmount: 0.5,    // Maximum SOL per trade
  minMindScore: 60,       // Minimum MIND survivability
  
  // Timing - ENHANCED FOR RAPID DETECTION
  cycleDelay: 3 * 60 * 1000,          // 3 minutes for main discovery cycle
  rapidScanInterval: 10 * 1000,       // 10 seconds for position monitoring
  devWalletScanInterval: 5 * 1000,    // 5 seconds for dev activity
  panicDetectionInterval: 15 * 1000,  // 15 seconds for panic detection
  
  // Risk management - ENHANCED THRESHOLDS
  maxNewTokens: 2,           // Max new tokens to try per session
  maxDailySpend: 5,          // Maximum SOL to spend per day
  panicSellThreshold: 50,    // Standard panic threshold
  stopLossPercentage: 25,    // Stop loss at 25% down
  
  // CRITICAL: Emergency exit thresholds
  EMERGENCY_THRESHOLDS: {
    PANIC_SCORE: 80,         // Emergency exit if panic > 80%
    MIND_SCORE_DROP: 30,     // Exit if M.I.N.D. drops >30 points
    SURVIVABILITY_FLOOR: 25, // Emergency exit if survivability < 25%
    DEV_DUMP_PERCENT: 15,    // Exit if dev sells >15%
  },
  
  // Profit taking - ENHANCED
  profitTarget1: 25,         // Take 10% profit at 25% gain
  profitTarget2: 50,         // Take 25% profit at 50% gain
  profitTarget3: 100,        // Take 50% profit at 100% gain
  
  // Modes
  testMode: false,           // LIVE TRADING MODE
  whaleMode: false,          // Enable whale-sized trades
  conservativeMode: false,   // Only trade on very strong signals
  verboseLogging: true,      // Detailed logging
  
  // NEW: Rapid monitoring toggle
  rapidMonitoringEnabled: true,  // Enable 10-second position scans
};

// Enhanced session tracking
let cycleCount = 0;
const tradedTokens = new Map(); // Original tracking for compatibility
const sessionStats = {
  totalBuys: 0,
  totalSells: 0,
  totalSpent: 0,
  totalEarned: 0,
  tokensAnalyzed: 0,
  tradesExecuted: 0,
  startTime: Date.now(),
  dailySpent: 0,
  lastDayReset: new Date().toDateString(),
  profitTaken: 0,
  emergencyExits: 0,
  rapidScansCompleted: 0
};

// Initialize enhanced systems
const riskMonitor = new RealTimeRiskMonitor();
const profitSniper = new ProfitSniper();

// Set profit strategy based on market conditions
profitSniper.setStrategy('CONSERVATIVE'); // Default strategy

// Helper function to check if we're in peak trading hours
function isPeakTradingHour(peakHours) {
  if (!peakHours || peakHours.length === 0) return false;
  const currentHour = new Date().getUTCHours();
  return peakHours.includes(currentHour);
}

// Helper function to extract MIND action
function extractMindAction(mindResult) {
  if (mindResult.tradeSuggestion?.action) {
    return mindResult.tradeSuggestion.action;
  }
  
  if (mindResult.suggestedAction) {
    const match = mindResult.suggestedAction.match(/^(\w+)/);
    return match ? match[1] : 'HOLD';
  }
  
  return 'HOLD';
}

// Enhanced trade size calculation
function calculateTradeSize(mindResult, baseAmount) {
  const survivability = mindResult.survivabilityScore;
  const confidence = mindResult.tradeSuggestion?.percentage || 50;
  
  let multiplier = 1.0;
  
  if (survivability >= 90 && confidence >= 75) {
    multiplier = 3.0;  // Maximum confidence
  } else if (survivability >= 80 && confidence >= 50) {
    multiplier = 2.0;  // High confidence
  } else if (survivability >= 70) {
    multiplier = 1.5;  // Good confidence
  } else if (survivability >= 60) {
    multiplier = 1.0;  // Standard
  } else {
    multiplier = 0.5;  // Reduced confidence
  }
  
  // Apply peak hour boost
  if (isPeakTradingHour(mindResult.peakTradingHours)) {
    multiplier *= config.peakHourMultiplier || 1.5;
  }
  
  const finalAmount = baseAmount * multiplier;
  return Math.min(finalAmount, config.maxTradeAmount);
}

// Enhanced position tracking with rapid monitoring integration
function trackNewPosition(tokenMint, entryData) {
  // Track in original system for compatibility
  tradedTokens.set(tokenMint, entryData);
  
  // Add to rapid risk monitoring
  riskMonitor.addPosition(tokenMint, entryData.symbol || 'UNKNOWN', entryData.mindScore || 0);
  
  // Add to profit sniper
  profitSniper.trackPosition(tokenMint, entryData);
  
  console.log(`🎯 Position tracked in ALL systems: ${entryData.symbol}`);
}

// Remove position from all tracking systems
function removePositionFromTracking(tokenMint) {
  const position = tradedTokens.get(tokenMint);
  if (position) {
    tradedTokens.delete(tokenMint);
    riskMonitor.removePosition(tokenMint);
    // Note: ProfitSniper removes positions automatically when fully sold
    console.log(`✅ Position removed from tracking: ${position.symbol}`);
  }
}

// Check wallet balance
async function checkWalletBalance() {
  try {
    const connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
    );
    
    const pubkey = new PublicKey(config.walletAddress);
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    return solBalance;
  } catch (error) {
    console.error('Could not check wallet balance:', error.message);
    return 0;
  }
}

// Reset daily spending limit
function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== sessionStats.lastDayReset) {
    sessionStats.dailySpent = 0;
    sessionStats.lastDayReset = today;
    console.log('📅 Daily spending limit reset');
  }
}

// Enhanced position monitoring with profit sniper
async function monitorPositions() {
  if (tradedTokens.size === 0) {
    return;
  }
  
  console.log('\n💎 Monitoring positions with ProfitSniper...');
  
  // Let ProfitSniper handle all position monitoring
  await profitSniper.monitorAllPositions();
  
  // Display profit sniper stats
  const stats = profitSniper.getSessionStats();
  console.log(`📊 ProfitSniper: ${stats.activePositions} active, ${stats.totalSells} sells executed`);
}

// Enhanced main trading cycle
async function enhancedSmartTradingCycle() {
  cycleCount++;
  const cycleStartTime = Date.now();
  
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🤖 Enhanced Smart Trader Cycle #${cycleCount}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log(`💰 Daily spent: ${sessionStats.dailySpent.toFixed(3)}/${config.maxDailySpend} SOL`);
  console.log(`🔍 Rapid monitoring: ${riskMonitor.getMonitoringStatus().isActive ? '✅ ACTIVE' : '❌ INACTIVE'}`);
  console.log(`📊 Positions under watch: ${riskMonitor.getMonitoringStatus().positionsMonitored}`);
  console.log(`💎 ProfitSniper positions: ${profitSniper.getSessionStats().activePositions}`);
  console.log('─'.repeat(70));
  
  checkDailyReset();
  
  try {
    // Check if we've hit daily limit
    if (sessionStats.dailySpent >= config.maxDailySpend) {
      console.log('📛 Daily spending limit reached. Monitoring positions only...');
      await monitorPositions();
      return;
    }
    
    // 1. Monitor existing positions with ProfitSniper (profit taking)
    await monitorPositions();
    
    // 2. Check existing positions for MIND-based sell signals
    for (const [tokenMint, position] of tradedTokens.entries()) {
      if (position.emergencyExitTriggered) continue;
      
      console.log(`\n🔍 Analyzing ${position.symbol} for sell opportunity...`);
      
      // Temporarily switch to analyze this token
      const originalToken = process.env.HELIUS_TARGET_WALLET;
      process.env.HELIUS_TARGET_WALLET = tokenMint;
      
      try {
        const positionResult = await runMindEngine();
        const positionAction = extractMindAction(positionResult);
        
        console.log(`   M.I.N.D. Signal: ${positionAction} (${positionResult.survivabilityScore}%)`);
        console.log(`   Risk Level: ${positionResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
        console.log(`   Panic Score: ${positionResult.panicScore || 0}%`);
        
        // Check for sell conditions (non-emergency - emergency handled by rapid monitoring)
        if (positionAction === 'SELL' && positionResult.survivabilityScore > config.EMERGENCY_THRESHOLDS.SURVIVABILITY_FLOOR) {
          const sellPercentage = positionResult.tradeSuggestion?.percentage || 50;
          
          console.log(`\n💰 SELL SIGNAL for ${position.symbol}!`);
          console.log(`   Reason: ${positionResult.tradeSuggestion?.reason || 'Risk detected'}`);
          
          if (!config.testMode) {
            const success = await initiateCoordinatedSell(tokenMint, sellPercentage);
            if (success) {
              sessionStats.totalSells++;
              // Update or remove position based on percentage sold
              if (sellPercentage >= 100) {
                removePositionFromTracking(tokenMint);
              }
            }
          } else {
            console.log(`🧪 TEST MODE: Would sell ${sellPercentage}% of ${position.symbol}`);
          }
        }
        
      } catch (error) {
        console.error(`Error analyzing position ${position.symbol}:`, error.message);
      } finally {
        // Restore primary token
        process.env.HELIUS_TARGET_WALLET = originalToken;
      }
    }
    
    // 3. Analyze primary token for new buy opportunities
    console.log('\n🧠 Running M.I.N.D. analysis for primary token...');
    
    const primaryResult = await runMindEngine();
    sessionStats.tokensAnalyzed++;
    
    // Display detailed analysis
    console.log(`\n📊 M.I.N.D. Analysis Results:`);
    console.log(`   🌱 Survivability: ${primaryResult.survivabilityScore}%`);
    console.log(`   😱 Panic Score: ${primaryResult.panicScore || 0}%`);
    console.log(`   🐋 Whale Activity: ${primaryResult.whaleActivity ? 'DETECTED' : 'None'}`);
    console.log(`   📊 Volume Trend: ${primaryResult.volumeTrend?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`   ⚠️ Risk Level: ${primaryResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
    console.log(`   💰 Suggested Action: ${primaryResult.tradeSuggestion?.action} (${primaryResult.tradeSuggestion?.percentage || 0}%)`);
    console.log(`   📝 Reason: ${primaryResult.tradeSuggestion?.reason || 'No reason provided'}`);
    
    // Display consumer profile
    if (primaryResult.consumerProfile) {
      console.log(`\n👥 Consumer Profile:`);
      console.log(`   🦐 Shrimps: ${primaryResult.consumerProfile.shrimpPercent.toFixed(1)}%`);
      console.log(`   🐬 Dolphins: ${primaryResult.consumerProfile.dolphinPercent.toFixed(1)}%`);
      console.log(`   🐋 Whales: ${primaryResult.consumerProfile.whalePercent.toFixed(1)}%`);
    }
    
    // Set dynamic profit strategy based on M.I.N.D. analysis
    setDynamicProfitStrategy(primaryResult);
    
    // Get the action from MIND
    const mindAction = extractMindAction(primaryResult);
    
    if (config.verboseLogging) {
      console.log(`\n🔍 Debug: MIND recommends ${mindAction}`);
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
            
            // CRITICAL: Track in all enhanced systems
            const positionData = {
              symbol: 'DUTCHBROS', // or extract from token data
              entryPrice: 1.0, // You'd get this from market data
              entrySol: buySize,
              mindScore: primaryResult.survivabilityScore,
              entryTime: Date.now(),
              amount: buySize,
              buyPrice: buySize, // Compatibility with existing code
              timestamp: Date.now()
            };
            
            trackNewPosition(config.primaryToken, positionData);
            
            sessionStats.tradesExecuted++;
            sessionStats.totalBuys++;
            sessionStats.totalSpent += buySize;
            sessionStats.dailySpent += buySize;
            
            console.log('✅ Buy order executed and tracked in ALL systems');
            
          } catch (error) {
            console.error('❌ Buy execution failed:', error.message);
          }
        } else if (config.testMode) {
          console.log(`🧪 TEST MODE: Would buy ${buySize.toFixed(3)} SOL`);
        } else {
          console.log(`⚠️ Buy skipped - would exceed daily limit`);
        }
        break;
        
      case 'HOLD':
        console.log('\n⏸️ HOLDING - Maintaining current position');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Waiting for better signals'}`);
        break;
        
      case 'SELL':
        console.log(`\n📉 SELL Signal: ${primaryResult.tradeSuggestion?.percentage || 50}% of position`);
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Risk increasing'}`);
        
        if (!config.testMode && tradedTokens.has(config.primaryToken)) {
          const sellPercentage = primaryResult.tradeSuggestion?.percentage || 50;
          const success = await initiateCoordinatedSell(config.primaryToken, sellPercentage);
          if (success) {
            sessionStats.totalSells++;
            console.log(`✅ Sold ${sellPercentage}% of position`);
          }
        } else {
          console.log('🧪 TEST MODE: Would sell here');
        }
        break;
        
      case 'EXIT':
        console.log('\n🚨 EXIT SIGNAL - Critical risk detected!');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'High risk conditions'}`);
        
        if (!config.testMode && tradedTokens.has(config.primaryToken)) {
          const success = await emergencyExitPosition(config.primaryToken);
          if (success) {
            sessionStats.totalSells++;
            sessionStats.emergencyExits++;
            removePositionFromTracking(config.primaryToken);
            console.log('✅ Emergency exit completed');
          }
        } else {
          console.log('🧪 TEST MODE: Would emergency exit');
        }
        break;
        
      default:
        console.log(`\n❓ Unknown action: ${mindAction}`);
        console.log('   Defaulting to HOLD');
    }
    
    // 4. Scan for new opportunities (if enabled)
    if (config.scanNewTokens && cycleCount % config.scanInterval === 0) {
      console.log('\n🔍 Scanning for new token opportunities...');
      
      try {
        const connection = new Connection(
          process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
        );
        
        const tokens = await scanAllTokens(connection);
        
        if (tokens.length > 0 && tradedTokens.size < config.maxNewTokens) {
          console.log(`\n🎯 Found ${tokens.length} potential opportunities`);
          
          // Analyze top tokens with MIND
          for (let i = 0; i < Math.min(3, tokens.length); i++) {
            const token = tokens[i];
            
            console.log(`\n🔬 Analyzing: ${token.symbol} (Score: ${token.score})`);
            
            // Switch to new token for analysis
            const originalToken = process.env.HELIUS_TARGET_WALLET;
            process.env.HELIUS_TARGET_WALLET = token.mint;
            
            try {
              const tokenResult = await runMindEngine();
              
              if (tokenResult.survivabilityScore >= config.minMindScore) {
                console.log(`   ✅ ${token.symbol} meets criteria - M.I.N.D.: ${tokenResult.survivabilityScore}%`);
                
                if (!config.testMode) {
                  // Execute buy for new token
                  const newTokenBuySize = config.baseTradeAmount;
                  await initiateCoordinatedBuy(newTokenBuySize);
                  
                  // Track new position
                  const newPositionData = {
                    symbol: token.symbol,
                    entryPrice: 1.0,
                    entrySol: newTokenBuySize,
                    mindScore: tokenResult.survivabilityScore,
                    entryTime: Date.now(),
                    amount: newTokenBuySize,
                    buyPrice: newTokenBuySize,
                    timestamp: Date.now()
                  };
                  
                  trackNewPosition(token.mint, newPositionData);
                  
                  sessionStats.totalBuys++;
                  sessionStats.totalSpent += newTokenBuySize;
                  sessionStats.dailySpent += newTokenBuySize;
                  
                  console.log(`   🚀 Bought ${token.symbol} and added to rapid monitoring`);
                }
              } else {
                console.log(`   ❌ ${token.symbol} below threshold: ${tokenResult.survivabilityScore}%`);
              }
              
            } catch (error) {
              console.error(`Error analyzing ${token.symbol}:`, error.message);
            } finally {
              process.env.HELIUS_TARGET_WALLET = originalToken;
            }
          }
        }
      } catch (error) {
        console.error('Error in token scanning:', error.message);
      }
    }
    
    // 5. Display enhanced monitoring status
    const riskStatus = riskMonitor.getMonitoringStatus();
    const profitStatus = profitSniper.getSessionStats();
    
    console.log('\n🔍 Enhanced Monitoring Status:');
    console.log(`   Risk Monitor: ${riskStatus.isActive ? '✅ Active' : '❌ Inactive'}`);
    console.log(`   Positions Monitored: ${riskStatus.positionsMonitored}`);
    console.log(`   ProfitSniper: ${profitStatus.currentStrategy} strategy`);
    console.log(`   Recent Alerts: ${riskStatus.recentAlerts.length}`);
    
    if (riskStatus.recentAlerts.length > 0) {
      console.log('\n⚠️ Recent Risk Alerts:');
      riskStatus.recentAlerts.slice(-3).forEach(alert => {
        console.log(`   ${alert.level}: ${alert.message}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Cycle error:', error.message);
    if (config.verboseLogging) {
      console.error('Stack:', error.stack);
    }
  }
  
  // Show enhanced session statistics
  const sessionDuration = (Date.now() - sessionStats.startTime) / 1000 / 60; // minutes
  console.log(`\n📊 Enhanced Session Statistics:`);
  console.log(`   Duration: ${sessionDuration.toFixed(1)} minutes`);
  console.log(`   Cycles Run: ${cycleCount}`);
  console.log(`   Tokens Analyzed: ${sessionStats.tokensAnalyzed}`);
  console.log(`   Buy Orders: ${sessionStats.totalBuys}`);
  console.log(`   Sell Orders: ${sessionStats.totalSells}`);
  console.log(`   Emergency Exits: ${sessionStats.emergencyExits}`);
  console.log(`   Total Spent: ${sessionStats.totalSpent.toFixed(4)} SOL`);
  console.log(`   Active Positions: ${tradedTokens.size}`);
  console.log(`   Rapid Scans: ${sessionStats.rapidScansCompleted}`);
  
  const cycleTime = Date.now() - cycleStartTime;
  console.log(`\n⏱️ Cycle completed in ${(cycleTime / 1000).toFixed(1)} seconds`);
  console.log(`⏰ Next cycle in ${(config.cycleDelay / 60000).toFixed(1)} minutes`);
}

// Set dynamic profit strategy based on M.I.N.D. analysis
function setDynamicProfitStrategy(mindResult) {
  const survivability = mindResult.survivabilityScore;
  const panicScore = mindResult.panicScore || 0;
  const whaleActivity = mindResult.whaleActivity;
  
  if (survivability >= 90 && panicScore < 20) {
    profitSniper.setStrategy('DIAMOND_HANDS');
  } else if (whaleActivity && survivability >= 75) {
    profitSniper.setStrategy('WHALE');
  } else if (panicScore > 50 || survivability < 60) {
    profitSniper.setStrategy('AGGRESSIVE');
  } else {
    profitSniper.setStrategy('CONSERVATIVE');
  }
}

// Main function
async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  🦉 HootBot Enhanced Smart Trader v4.0 - Rapid Risk Detection! 🚨 ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Enhanced Configuration:');
  console.log(`   Primary Token: ${config.primaryToken}`);
  console.log(`   Wallet: ${config.walletAddress}`);
  console.log(`   Mode: ${config.testMode ? '🧪 TEST MODE' : '💰 LIVE TRADING'}`);
  console.log(`   Scanner: ${config.scanNewTokens ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   Main Cycle: ${config.cycleDelay / 60000} minutes`);
  console.log(`   🚨 Rapid Monitoring: ${config.rapidMonitoringEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   🔍 Position Scans: Every ${config.rapidScanInterval / 1000} seconds`);
  console.log(`   👀 Dev Monitoring: Every ${config.devWalletScanInterval / 1000} seconds`);
  console.log(`   😱 Panic Detection: Every ${config.panicDetectionInterval / 1000} seconds`);
  console.log(`   Base Trade Size: ${config.baseTradeAmount} SOL`);
  console.log(`   Max Trade Size: ${config.maxTradeAmount} SOL`);
  console.log(`   Daily Limit: ${config.maxDailySpend} SOL`);
  console.log(`   Min MIND Score: ${config.minMindScore}%`);
  console.log(`   Emergency Thresholds:`);
  console.log(`     - Panic Score: ${config.EMERGENCY_THRESHOLDS.PANIC_SCORE}%`);
  console.log(`     - M.I.N.D. Drop: ${config.EMERGENCY_THRESHOLDS.MIND_SCORE_DROP} points`);
  console.log(`     - Survivability Floor: ${config.EMERGENCY_THRESHOLDS.SURVIVABILITY_FLOOR}%`);
  
  // Check initial wallet balance
  const initialBalance = await checkWalletBalance();
  console.log(`\n💰 Starting Balance: ${initialBalance.toFixed(4)} SOL`);
  
  if (!config.testMode && initialBalance < 0.1) {
    console.log('\n❌ Insufficient balance for trading. Please fund your wallet.');
    process.exit(1);
  }
  
  console.log('\n🚨 ENHANCED LIVE TRADING MODE ACTIVE 🚨');
  console.log('⚡ Features: Rapid Risk Detection, Auto-Profit Taking, Emergency Exits');
  console.log('🎯 Risk Detection Speed: 10-30 seconds vs 3+ minutes');
  console.log('Press Ctrl+C to stop at any time.\n');
  
  console.log('🚀 Starting enhanced trading cycles...\n');
  
  // Main trading loop
  while (true) {
    await enhancedSmartTradingCycle();
    console.log('\n' + '═'.repeat(70) + '\n');
    
    // Wait for next cycle
    await new Promise(resolve => setTimeout(resolve, config.cycleDelay));
  }
}

// Enhanced graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('\n\n👋 Enhanced HootBot shutting down gracefully...');
  
  // Emergency exit all positions if any critical alerts
  const riskStatus = riskMonitor.getMonitoringStatus();
  if (riskStatus.recentAlerts.some(alert => alert.level === 'CRITICAL')) {
    console.log('🚨 CRITICAL ALERTS DETECTED - Emergency exiting all positions...');
    await riskMonitor.emergencyExitAll("Shutdown with critical alerts");
  }
  
  console.log('📊 Final Enhanced Session Summary:');
  console.log(`   Total Cycles: ${cycleCount}`);
  console.log(`   Tokens Discovered: ${tradedTokens.size}`);
  console.log(`   Buy Orders: ${sessionStats.totalBuys}`);
  console.log(`   Sell Orders: ${sessionStats.totalSells}`);
  console.log(`   Emergency Exits: ${sessionStats.emergencyExits}`);
  console.log(`   Total Spent: ${sessionStats.totalSpent.toFixed(4)} SOL`);
  console.log(`   Total Earned: ${sessionStats.totalEarned.toFixed(4)} SOL`);
  console.log(`   Net P&L: ${(sessionStats.totalEarned - sessionStats.totalSpent).toFixed(4)} SOL`);
  console.log(`   Session Duration: ${((Date.now() - sessionStats.startTime) / 1000 / 60).toFixed(1)} minutes`);
  console.log(`   Rapid Scans Completed: ${sessionStats.rapidScansCompleted}`);
  
  const profitStats = profitSniper.getSessionStats();
  console.log(`   ProfitSniper Sells: ${profitStats.totalSells}`);
  console.log(`   Final Strategy: ${profitStats.currentStrategy}`);
  
  if (tradedTokens.size > 0) {
    console.log('\n📈 Final Active Positions:');
    for (const [mint, data] of tradedTokens.entries()) {
      console.log(`   ${data.symbol}: ${data.entrySol.toFixed(3)} SOL (M.I.N.D.: ${data.mindScore}%)`);
    }
  }
  
  console.log('\n✨ Thanks for using Enhanced HootBot! 🦉🚨');
  process.exit(0);
});

// Start the enhanced trader
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  enhancedSmartTradingCycle,
  trackNewPosition,
  removePositionFromTracking,
  config,
  riskMonitor,
  profitSniper
};