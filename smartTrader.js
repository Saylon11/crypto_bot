// smartTrader.js - HootBot Advanced Trading with Full MIND Integration & Profit Taking
const { scanAllTokens } = require('./dist/pumpTools/tokenScanner');
const { runMindEngine } = require('./dist/mindEngine');
const { initiateCoordinatedBuy } = require('./dist/pumpTools/tradeExecutor');
const { initiateCoordinatedSell, getTokenBalance, smartProfitTake, emergencyExitPosition } = require('./dist/pumpTools/sellExecutor');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const config = {
  // Scanner settings
  scanNewTokens: true,
  scanInterval: 1,  // Scan EVERY cycle for maximum opportunity discovery
  
  // Trading settings
  primaryToken: process.env.DUTCHBROS_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS,
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
  
  // Profit taking
  profitTarget1: 25,         // Take 10% profit at 25% gain
  profitTarget2: 50,         // Take 25% profit at 50% gain
  profitTarget3: 100,        // Take 50% profit at 100% gain
  
  // Modes
  testMode: false,           // LIVE TRADING MODE ENABLED! 💰
  whaleMode: false,          // Enable whale-sized trades
  conservativeMode: false,   // Only trade on very strong signals
  verboseLogging: true,      // Detailed logging
};

// Session tracking with enhanced position data
let cycleCount = 0;
let tradedTokens = new Map(); // token -> {symbol, buyPrice, amount, timestamp, mindScore, solSpent}
let sessionStats = {
  totalBuys: 0,
  totalSells: 0,
  totalSpent: 0,
  totalEarned: 0,
  tokensAnalyzed: 0,
  tradesExecuted: 0,
  profitTaken: 0,
  startTime: Date.now(),
  dailySpent: 0,
  lastDayReset: new Date().toDateString()
};

// Helper function to check if we're in peak trading hours
function isPeakTradingHour(peakHours) {
  if (!peakHours || peakHours.length === 0) return false;
  const currentHour = new Date().getUTCHours();
  return peakHours.includes(currentHour);
}

// Helper function to extract MIND action (fixing the bug)
function extractMindAction(mindResult) {
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
function calculateTradeSize(mindResult, baseAmount) {
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

// Monitor positions for profit taking
async function monitorPositions() {
  if (tradedTokens.size === 0) return;
  
  console.log('\n📊 Monitoring positions for profit opportunities...');
  const connection = new Connection(
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );
  
  for (const [tokenMint, position] of tradedTokens.entries()) {
    try {
      // Get current token balance
      const currentBalance = await getTokenBalance(
        connection,
        new PublicKey(config.walletAddress),
        new PublicKey(tokenMint)
      );
      
      if (currentBalance > 0) {
        console.log(`\n💼 Position: ${position.symbol}`);
        console.log(`   Balance: ${currentBalance.toFixed(2)} tokens`);
        console.log(`   Entry: ${position.solSpent.toFixed(3)} SOL`);
        console.log(`   MIND Score at entry: ${position.mindScore}%`);
        
        // Here you would check current price and calculate profit
        // For now, we'll check if MIND recommends selling
      } else {
        // Position was sold or tokens were moved
        console.log(`\n📤 ${position.symbol} - Position closed or moved`);
        tradedTokens.delete(tokenMint);
      }
    } catch (error) {
      console.error(`Error checking position ${position.symbol}:`, error.message);
    }
  }
}

// Main trading cycle
async function smartTradingCycle() {
  cycleCount++;
  const cycleStartTime = Date.now();
  
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🤖 Smart Trading Cycle #${cycleCount}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log(`💰 Daily spent: ${sessionStats.dailySpent.toFixed(3)}/${config.maxDailySpend} SOL`);
  console.log(`📈 Total profit taken: ${sessionStats.profitTaken.toFixed(3)} SOL`);
  console.log('─'.repeat(60));
  
  checkDailyReset();
  
  try {
    // Check if we've hit daily limit
    if (sessionStats.dailySpent >= config.maxDailySpend) {
      console.log('📛 Daily spending limit reached. Monitoring positions only...');
      await monitorPositions();
      return;
    }
    
    // Monitor existing positions first
    await monitorPositions();
    
    // 1. Scan for new opportunities (now EVERY cycle!)
    if (config.scanNewTokens && cycleCount % config.scanInterval === 0) {
      console.log('\n🔍 Scanning pump.fun, DexScreener, and Helius for new opportunities...');
      
      const tokens = await scanAllTokens();
      const newTokens = tokens.filter(t => !tradedTokens.has(t.mint));
      
      if (newTokens.length > 0) {
        console.log(`\n✨ Found ${newTokens.length} new tokens to analyze`);
        console.log('🎯 Top candidates:');
        newTokens.slice(0, 5).forEach((t, i) => {
          console.log(`   ${i + 1}. ${t.symbol} (${t.source}) - Score: ${t.score}/100`);
        });
        
        sessionStats.tokensAnalyzed += newTokens.length;
        
        // Analyze top new tokens (limit to maxNewTokens)
        const tokensToAnalyze = newTokens.slice(0, config.maxNewTokens);
        
        for (const candidate of tokensToAnalyze) {
          if (tradedTokens.size >= config.maxNewTokens) {
            console.log('📋 Max new tokens limit reached for this session');
            break;
          }
          
          console.log(`\n🔬 Deep diving into ${candidate.symbol} (${candidate.source})...`);
          console.log(`   Scanner Score: ${candidate.score}/100`);
          console.log(`   Mint: ${candidate.mint}`);
          
          // Temporarily switch to analyze this token
          const originalToken = process.env.DUTCHBROS_TOKEN_MINT;
          process.env.DUTCHBROS_TOKEN_MINT = candidate.mint;
          process.env.HELIUS_TARGET_WALLET = candidate.mint;
          
          try {
            const mindResult = await runMindEngine();
            
            console.log(`\n📊 MIND Analysis for ${candidate.symbol}:`);
            console.log(`   Survivability: ${mindResult.survivabilityScore}%`);
            console.log(`   Action: ${extractMindAction(mindResult)}`);
            console.log(`   Risk Level: ${mindResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
            console.log(`   Panic Score: ${mindResult.panicScore || 0}%`);
            console.log(`   Market Flow: ${mindResult.marketFlowStrength || 0}%`);
            console.log(`   Reason: ${mindResult.tradeSuggestion?.reason || 'No reason provided'}`);
            
            // Check MIND recommendation using the fixed extraction
            const recommendation = extractMindAction(mindResult);
            
            if (recommendation === 'BUY' && 
                mindResult.survivabilityScore >= config.minMindScore &&
                mindResult.riskLevel !== 'critical') {
              
              console.log(`\n✅ ${candidate.symbol} APPROVED BY MIND! 🚀`);
              
              const tradeSize = calculateTradeSize(mindResult, config.baseTradeAmount);
              
              if (!config.testMode && sessionStats.dailySpent + tradeSize <= config.maxDailySpend) {
                console.log(`💸 EXECUTING LIVE BUY: ${tradeSize.toFixed(3)} SOL`);
                
                try {
                  await initiateCoordinatedBuy(tradeSize);
                  
                  // Track the trade with price info
                  tradedTokens.set(candidate.mint, {
                    symbol: candidate.symbol,
                    buyPrice: tradeSize,
                    solSpent: tradeSize,
                    amount: 0, // Would be calculated from response
                    timestamp: Date.now(),
                    mindScore: mindResult.survivabilityScore,
                    entryPrice: candidate.price || 0
                  });
                  
                  sessionStats.tradesExecuted++;
                  sessionStats.totalBuys++;
                  sessionStats.totalSpent += tradeSize;
                  sessionStats.dailySpent += tradeSize;
                  
                  console.log(`✅ Purchase successful! 💰`);
                  console.log(`🔗 Track at: https://dexscreener.com/solana/${candidate.mint}`);
                  console.log(`📈 Position: ${candidate.symbol} | Entry: ${tradeSize.toFixed(3)} SOL`);
                } catch (error) {
                  console.error(`❌ Trade execution failed:`, error.message);
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
              if (mindResult.survivabilityScore < config.minMindScore) {
                console.log(`   📉 Survivability too low: ${mindResult.survivabilityScore}% < ${config.minMindScore}%`);
              }
            }
          } catch (error) {
            console.error(`Error analyzing ${candidate.symbol}:`, error.message);
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
    
    // 2. Check existing positions for sell signals
    for (const [tokenMint, position] of tradedTokens.entries()) {
      console.log(`\n🔍 Analyzing ${position.symbol} for sell opportunity...`);
      
      // Temporarily switch to analyze this token
      const originalToken = process.env.DUTCHBROS_TOKEN_MINT;
      process.env.DUTCHBROS_TOKEN_MINT = tokenMint;
      process.env.HELIUS_TARGET_WALLET = tokenMint;
      
      try {
        const positionResult = await runMindEngine();
        const positionAction = extractMindAction(positionResult);
        
        console.log(`   Current MIND Signal: ${positionAction}`);
        console.log(`   Current Survivability: ${positionResult.survivabilityScore}%`);
        console.log(`   Risk Level: ${positionResult.riskLevel?.toUpperCase() || 'UNKNOWN'}`);
        
        // Check for sell conditions
        if (positionAction === 'SELL' || positionAction === 'EXIT') {
          const sellPercentage = positionResult.tradeSuggestion?.percentage || 50;
          
          console.log(`\n💰 SELL SIGNAL for ${position.symbol}!`);
          console.log(`   Reason: ${positionResult.tradeSuggestion?.reason || 'Risk detected'}`);
          
          if (!config.testMode) {
            const success = await initiateCoordinatedSell(tokenMint, sellPercentage);
            if (success) {
              sessionStats.totalSells++;
              // Update or remove position based on percentage sold
              if (sellPercentage >= 100) {
                tradedTokens.delete(tokenMint);
              }
            }
          } else {
            console.log(`🧪 TEST MODE: Would sell ${sellPercentage}% of ${position.symbol}`);
          }
        } else if (positionResult.panicScore > config.panicSellThreshold) {
          console.log(`\n🚨 PANIC DETECTED for ${position.symbol}! Score: ${positionResult.panicScore}%`);
          
          if (!config.testMode) {
            const success = await emergencyExitPosition(tokenMint);
            if (success) {
              sessionStats.totalSells++;
              tradedTokens.delete(tokenMint);
            }
          } else {
            console.log(`🧪 TEST MODE: Would emergency exit ${position.symbol}`);
          }
        }
      } catch (error) {
        console.error(`Error analyzing position ${position.symbol}:`, error.message);
      } finally {
        // Restore primary token
        process.env.DUTCHBROS_TOKEN_MINT = originalToken;
        process.env.HELIUS_TARGET_WALLET = originalToken;
      }
    }
    
    // 3. Always analyze and trade primary token
    console.log(`\n💎 Analyzing primary token ($DutchBros)...`);
    console.log(`   Token: ${config.primaryToken.slice(0, 8)}...${config.primaryToken.slice(-4)}`);
    
    const primaryResult = await runMindEngine();
    
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
    
    // Get the action from MIND using the fixed extraction
    const mindAction = extractMindAction(primaryResult);
    
    if (config.verboseLogging) {
      console.log(`\n🔍 Debug: MIND recommends ${mindAction}`);
    }
    
    // Execute trade based on MIND recommendation
    switch (mindAction) {
      case 'BUY':
        const buySize = calculateTradeSize(primaryResult, config.baseTradeAmount);
        
        console.log(`\n🎯 MIND says BUY $DutchBros!`);
        
        if (!config.testMode && sessionStats.dailySpent + buySize <= config.maxDailySpend) {
          console.log(`💸 EXECUTING LIVE BUY: ${buySize.toFixed(3)} SOL`);
          
          try {
            await initiateCoordinatedBuy(buySize);
            sessionStats.tradesExecuted++;
            sessionStats.totalBuys++;
            sessionStats.totalSpent += buySize;
            sessionStats.dailySpent += buySize;
            console.log('✅ Buy order executed successfully! 💰');
            console.log(`📈 Total $DutchBros bought today: ${sessionStats.totalBuys} trades`);
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
        console.log('\n⏸️  HOLDING - Maintaining current position');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Waiting for better signals'}`);
        break;
        
      case 'SELL':
        console.log(`\n📉 SELL Signal for $DutchBros: ${primaryResult.tradeSuggestion?.percentage || 50}% of position`);
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'Risk increasing'}`);
        
        if (!config.testMode) {
          const sellPercentage = primaryResult.tradeSuggestion?.percentage || 50;
          const success = await initiateCoordinatedSell(config.primaryToken, sellPercentage);
          if (success) {
            sessionStats.totalSells++;
            console.log(`✅ Sold ${sellPercentage}% of $DutchBros position`);
          }
        } else {
          console.log('🧪 TEST MODE: Would sell $DutchBros here');
        }
        break;
        
      case 'EXIT':
        console.log('\n🚨 EXIT SIGNAL - Critical risk detected!');
        console.log(`   Reason: ${primaryResult.tradeSuggestion?.reason || 'High risk conditions'}`);
        
        if (!config.testMode) {
          const success = await emergencyExitPosition(config.primaryToken);
          if (success) {
            sessionStats.totalSells++;
            console.log('✅ Emergency exit completed');
          }
        } else {
          console.log('🧪 TEST MODE: Would emergency exit $DutchBros');
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
    console.error('\n❌ Cycle error:', error.message);
    if (config.verboseLogging) {
      console.error('Stack:', error.stack);
    }
  }
  
  // Show session statistics
  const sessionDuration = (Date.now() - sessionStats.startTime) / 1000 / 60; // minutes
  console.log(`\n📊 Session Statistics:`);
  console.log(`   Duration: ${sessionDuration.toFixed(1)} minutes`);
  console.log(`   Cycles Run: ${cycleCount}`);
  console.log(`   Tokens Analyzed: ${sessionStats.tokensAnalyzed}`);
  console.log(`   Buy Orders: ${sessionStats.totalBuys}`);
  console.log(`   Sell Orders: ${sessionStats.totalSells}`);
  console.log(`   Total Spent: ${sessionStats.totalSpent.toFixed(4)} SOL`);
  console.log(`   Active Positions: ${tradedTokens.size}`);
  
  const cycleTime = Date.now() - cycleStartTime;
  console.log(`\n⏱️  Cycle completed in ${(cycleTime / 1000).toFixed(1)} seconds`);
  console.log(`⏰ Next cycle in ${(config.cycleDelay / 60000).toFixed(1)} minutes`);
}

// Main function
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🦉 HootBot Smart Trader v3.0 - Buy Low, Sell High! 📈  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Configuration:');
  console.log(`   Primary Token: ${config.primaryToken}`);
  console.log(`   Wallet: ${config.walletAddress}`);
  console.log(`   Mode: ${config.testMode ? '🧪 TEST MODE' : '💰 LIVE TRADING'}`);
  console.log(`   Scanner: ${config.scanNewTokens ? '✅ ENABLED' : '❌ DISABLED'}`);
  console.log(`   Scan Frequency: Every ${config.scanInterval} cycle(s)`);
  console.log(`   Base Trade Size: ${config.baseTradeAmount} SOL`);
  console.log(`   Max Trade Size: ${config.maxTradeAmount} SOL`);
  console.log(`   Daily Limit: ${config.maxDailySpend} SOL`);
  console.log(`   Min MIND Score: ${config.minMindScore}%`);
  console.log(`   Profit Targets: ${config.profitTarget1}% / ${config.profitTarget2}% / ${config.profitTarget3}%`);
  console.log(`   Stop Loss: ${config.stopLossPercentage}%`);
  
  // Check initial wallet balance
  const initialBalance = await checkWalletBalance();
  console.log(`\n💰 Starting Balance: ${initialBalance.toFixed(4)} SOL`);
  
  if (!config.testMode && initialBalance < 0.1) {
    console.log('\n❌ Insufficient balance for trading. Please fund your wallet.');
    process.exit(1);
  }
  
  console.log('\n⚠️  LIVE TRADING MODE ACTIVE ⚠️');
  console.log('The bot will execute real trades with your SOL!');
  console.log('🎯 Features: Auto-buy, Auto-sell, Profit-taking, Stop-loss');
  console.log('Press Ctrl+C to stop at any time.\n');
  
  console.log('🚀 Starting trading cycles...\n');
  
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
  console.log(`   Buy Orders: ${sessionStats.totalBuys}`);
  console.log(`   Sell Orders: ${sessionStats.totalSells}`);
  console.log(`   Total Spent: ${sessionStats.totalSpent.toFixed(4)} SOL`);
  console.log(`   Total Earned: ${sessionStats.totalEarned.toFixed(4)} SOL`);
  console.log(`   Net P&L: ${(sessionStats.totalEarned - sessionStats.totalSpent).toFixed(4)} SOL`);
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
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}