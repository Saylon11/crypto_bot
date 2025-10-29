// smartTraderBridge.js - Bridge version connecting real components
// Location: Desktop/HootBot/smartTraderBridge.js (ROOT)

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const dotenv = require('dotenv');
dotenv.config();

// Try to load real components, fall back to mocks if they fail
let runMindEngine, scanAllTokens, initiateCoordinatedBuy, initiateCoordinatedSell;

// Load MIND Engine
try {
  const mindEngine = require('./dist/mindEngine.js');
  runMindEngine = mindEngine.runMindEngine;
  console.log('✅ Real MIND Engine loaded');
} catch (error) {
  console.log('⚠️  Using mock MIND Engine:', error.message);
  runMindEngine = async () => {
    const survivability = Math.floor(Math.random() * 40) + 50;
    const panicScore = Math.floor(Math.random() * 70);
    
    let action = 'HOLD';
    let percentage = 0;
    let reason = '';
    
    if (survivability > 75 && panicScore < 20) {
      action = 'BUY';
      percentage = 50;
      reason = 'Strong fundamentals, low panic';
    } else if (survivability < 60 || panicScore > 50) {
      action = 'SELL';
      percentage = panicScore > 60 ? 100 : 50;
      reason = panicScore > 60 ? 'High panic detected' : 'Weak fundamentals';
    }
    
    return {
      tradeSuggestion: { action, percentage, reason },
      survivabilityScore: survivability,
      panicScore: panicScore,
      riskLevel: panicScore > 50 ? 'HIGH' : 'MEDIUM'
    };
  };
}

// Load Token Scanner
try {
  const scanner = require('./dist/pumpTools/tokenScanner.js');
  scanAllTokens = scanner.scanAllTokens;
  console.log('✅ Real Token Scanner loaded');
} catch (error) {
  console.log('⚠️  Using mock Token Scanner:', error.message);
  scanAllTokens = async () => [
    { mint: 'TEST1mint', symbol: 'TEST1', score: 85, source: 'mock' },
    { mint: 'TEST2mint', symbol: 'TEST2', score: 75, source: 'mock' }
  ];
}

// Load Trade Executor
try {
  const tradeExecutor = require('./dist/pumpTools/tradeExecutor.js');
  initiateCoordinatedBuy = tradeExecutor.initiateCoordinatedBuy;
  console.log('✅ Real Trade Executor loaded');
} catch (error) {
  console.log('⚠️  Using mock Trade Executor:', error.message);
  initiateCoordinatedBuy = async (amount) => {
    console.log(`   [MOCK] Would buy ${amount} SOL worth`);
    return true;
  };
}

// Load Sell Executor
try {
  const sellExecutor = require('./dist/pumpTools/sellExecutor.js');
  initiateCoordinatedSell = sellExecutor.initiateCoordinatedSell;
  console.log('✅ Real Sell Executor loaded');
} catch (error) {
  console.log('⚠️  Using mock Sell Executor:', error.message);
  initiateCoordinatedSell = async (mint, percentage) => {
    console.log(`   [MOCK] Would sell ${percentage}% of ${mint}`);
    return true;
  };
}

console.log(''); // Empty line after component loading

// Configuration
const config = {
  // Scanner settings
  scanNewTokens: true,
  scanInterval: 1,  // Scan every cycle
  
  // Trading settings
  walletAddress: process.env.HOOTBOT_WALLET_ADDRESS || '3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D',
  baseTradeAmount: 0.05,     // Base SOL per trade
  maxTradeAmount: 0.2,       // Maximum SOL per trade
  minMindScore: 70,          // Minimum MIND survivability
  maxPositions: 4,           // Maximum concurrent positions
  
  // Timing
  cycleDelay: 30 * 1000,     // 30 seconds between cycles
  
  // Risk management
  maxDailySpend: 2,          // Maximum SOL to spend per day
  panicSellThreshold: 60,    // Panic score threshold
  stopLossPercentage: 20,    // Stop loss at 20% down
  
  // Profit taking
  profitTarget1: 15,         // Take 25% profit at 15% gain
  profitTarget2: 30,         // Take 50% profit at 30% gain
  profitTarget3: 75,         // Take 75% profit at 75% gain
  
  // Modes
  testMode: true,            // Start in TEST MODE
  verboseLogging: true,      // Detailed logging
};

// Session tracking
let cycleCount = 0;
let tradedTokens = new Map();
let sessionStats = {
  totalBuys: 0,
  totalSells: 0,
  totalSpent: 0,
  totalEarned: 0,
  tokensAnalyzed: 0,
  startTime: Date.now(),
  dailySpent: 0,
  lastDayReset: new Date().toDateString(),
  wins: 0,
  losses: 0
};

// Extract MIND action properly
function extractMindAction(mindResult) {
  if (mindResult && mindResult.tradeSuggestion) {
    return {
      action: mindResult.tradeSuggestion.action || 'WAIT',
      percentage: mindResult.tradeSuggestion.percentage || 0,
      reason: mindResult.tradeSuggestion.reason || 'No reason provided',
      survivability: mindResult.survivabilityScore || 0,
      panicScore: mindResult.panicScore || 0
    };
  }
  
  if (mindResult && mindResult.action) {
    return {
      action: mindResult.action,
      percentage: mindResult.percentage || 50,
      reason: mindResult.reason || 'Direct action',
      survivability: mindResult.survivability || mindResult.survivabilityScore || 0,
      panicScore: mindResult.panicScore || 0
    };
  }
  
  // Check for broken static values
  if (mindResult && mindResult.survivabilityScore === 90) {
    console.warn('⚠️ MIND Engine returned static values - rejecting');
    return {
      action: 'WAIT',
      percentage: 0,
      reason: 'MIND Engine error - static values detected',
      survivability: 0,
      panicScore: 0
    };
  }
  
  return {
    action: 'WAIT',
    percentage: 0,
    reason: 'Failed to parse MIND result',
    survivability: 0,
    panicScore: 0
  };
}

// Check wallet balance
async function checkWalletBalance() {
  try {
    const connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    const walletPubkey = new PublicKey(config.walletAddress);
    const balance = await connection.getBalance(walletPubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Error checking balance:', error.message);
    return 0;
  }
}

// Calculate estimated P/L (mock for now)
function calculateEstimatedPL(positionData) {
  const timeHeld = (Date.now() - positionData.timestamp) / 1000 / 60;
  const mindDecay = (positionData.mindScore - 50) * 0.1;
  const randomVolatility = (Math.random() - 0.5) * 20;
  return -5 + mindDecay + randomVolatility - (timeHeld * 0.1);
}

// Monitor position
async function monitorPosition(mint, positionData) {
  console.log(`\n🔍 Checking ${positionData.symbol}...`);
  
  // Temporarily set token for MIND analysis
  const originalToken = process.env.TARGET_TOKEN_MINT;
  process.env.TARGET_TOKEN_MINT = mint;
  
  console.log(`\n🧠 === HootBot MIND Engine Analysis ===`);
  console.log(`📊 Analyzing token: ${mint.substring(0, 6)}...${mint.slice(-4)}`);
  
  const mindResult = await runMindEngine();
  
  // Restore original token
  process.env.TARGET_TOKEN_MINT = originalToken;
  
  const { action, percentage, reason, survivability, panicScore } = extractMindAction(mindResult);
  const holdTime = (Date.now() - positionData.timestamp) / 1000 / 60 / 60;
  const estimatedPL = calculateEstimatedPL(positionData);
  
  console.log(`\n📊 === MIND Analysis Complete ===`);
  console.log(`🎯 Survivability: ${survivability}%`);
  console.log(`📈 Action: ${action} (${percentage}%)`);
  console.log(`😱 Panic Score: ${panicScore}%`);
  console.log(`💫 Reason: ${reason}`);
  console.log(`   Hold time: ${holdTime.toFixed(1)} hours`);
  console.log(`   Estimated P/L: ${estimatedPL > 0 ? '+' : ''}${estimatedPL.toFixed(1)}%`);
  
  // Decision logic
  if (action === 'SELL' || action === 'EXIT') {
    console.log(`\n🚨 SELL SIGNAL for ${positionData.symbol}!`);
    if (!config.testMode) {
      await initiateCoordinatedSell(mint, percentage);
    } else {
      console.log(`   [TEST MODE] Would sell ${percentage}%`);
    }
    tradedTokens.delete(mint);
    sessionStats.totalSells++;
    return true;
  } else if (estimatedPL >= config.profitTarget1) {
    console.log(`\n💰 PROFIT TARGET REACHED for ${positionData.symbol}!`);
    console.log(`   P/L: +${estimatedPL.toFixed(1)}%`);
    
    let sellPercent = 25;
    if (estimatedPL >= config.profitTarget3) sellPercent = 75;
    else if (estimatedPL >= config.profitTarget2) sellPercent = 50;
    
    if (!config.testMode) {
      await initiateCoordinatedSell(mint, sellPercent);
    } else {
      console.log(`   [TEST MODE] Would take ${sellPercent}% profits`);
    }
    sessionStats.totalSells++;
    sessionStats.wins++;
    return true;
  } else if (estimatedPL <= -config.stopLossPercentage) {
    console.log(`\n🛑 STOP LOSS TRIGGERED for ${positionData.symbol}!`);
    console.log(`   P/L: ${estimatedPL.toFixed(1)}%`);
    
    if (!config.testMode) {
      await initiateCoordinatedSell(mint, 100);
    } else {
      console.log(`   [TEST MODE] Would exit position`);
    }
    tradedTokens.delete(mint);
    sessionStats.totalSells++;
    sessionStats.losses++;
    return true;
  }
  
  return false;
}

// Main trading cycle
async function tradingCycle() {
  cycleCount++;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`🤖 Trading Cycle #${cycleCount} - ${config.testMode ? 'TEST' : 'LIVE'} MODE`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log(`💰 Daily spent: ${sessionStats.dailySpent.toFixed(3)}/${config.maxDailySpend} SOL`);
  console.log(`⚡ Scan frequency: EVERY CYCLE`);
  
  try {
    // Monitor existing positions
    if (tradedTokens.size > 0) {
      console.log(`\n📊 Monitoring ${tradedTokens.size} active positions...`);
      
      for (const [mint, positionData] of tradedTokens.entries()) {
        await monitorPosition(mint, positionData);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay
      }
    }
    
    // Scan for new opportunities
    const slotsAvailable = config.maxPositions - tradedTokens.size;
    const canSpendMore = sessionStats.dailySpent < config.maxDailySpend;
    
    if (slotsAvailable > 0 && canSpendMore && config.scanNewTokens) {
      console.log(`\n🔍 Scanning for new opportunities (${slotsAvailable} slots available)...`);
      
      const tokens = await scanAllTokens();
      sessionStats.tokensAnalyzed += tokens.length;
      console.log(`Found ${tokens.length} tokens`);
      
      const hotTokens = tokens
        .filter(t => t.score >= 80)
        .slice(0, slotsAvailable);
      
      for (const token of hotTokens) {
        console.log(`\n🧠 Analyzing ${token.symbol} with MIND...`);
        
        // Set token for MIND analysis
        process.env.TARGET_TOKEN_MINT = token.mint;
        const mindResult = await runMindEngine();
        const { action, percentage, survivability, reason } = extractMindAction(mindResult);
        
        console.log(`📊 MIND Result: ${action} (${survivability}% survivability)`);
        
        if (action === 'BUY' && survivability >= config.minMindScore) {
          console.log(`✅ ${token.symbol} approved by MIND!`);
          console.log(`   Reason: ${reason}`);
          
          const tradeAmount = config.baseTradeAmount;
          
          if (!config.testMode) {
            await initiateCoordinatedBuy(tradeAmount);
          } else {
            console.log(`💰 [TEST MODE] Would buy ${tradeAmount} SOL worth`);
          }
          
          tradedTokens.set(token.mint, {
            symbol: token.symbol,
            buyPrice: tradeAmount,
            timestamp: Date.now(),
            mindScore: survivability
          });
          
          sessionStats.totalBuys++;
          sessionStats.totalSpent += tradeAmount;
          sessionStats.dailySpent += tradeAmount;
        } else if (survivability < config.minMindScore) {
          console.log(`❌ ${token.symbol} rejected - MIND score too low (${survivability}%)`);
        }
      }
    } else if (!canSpendMore) {
      console.log('\n💸 Daily spend limit reached');
    }
    
  } catch (error) {
    console.error('\n❌ Cycle error:', error.message);
    if (config.verboseLogging) {
      console.error('Stack:', error.stack);
    }
  }
  
  // Show statistics
  const winRate = sessionStats.wins + sessionStats.losses > 0 
    ? (sessionStats.wins / (sessionStats.wins + sessionStats.losses) * 100).toFixed(0)
    : 0;
  
  console.log(`\n📊 Session Statistics:`);
  console.log(`   Duration: ${((Date.now() - sessionStats.startTime) / 60000).toFixed(1)} minutes`);
  console.log(`   Cycles: ${cycleCount}`);
  console.log(`   Analyzed: ${sessionStats.tokensAnalyzed} tokens`);
  console.log(`   Buys: ${sessionStats.totalBuys}`);
  console.log(`   Sells: ${sessionStats.totalSells}`);
  console.log(`   Win/Loss: ${sessionStats.wins}W/${sessionStats.losses}L (${winRate}%)`);
  console.log(`   Active Positions: ${tradedTokens.size}/${config.maxPositions}`);
  
  console.log(`\n⏰ Next cycle in ${config.cycleDelay / 1000} seconds`);
}

// Main function
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🦉 HootBot Bridge Trader - Real Components! 🚀         ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Configuration:');
  console.log(`   Mode: ${config.testMode ? '🧪 TEST MODE' : '💰 LIVE TRADING'}`);
  console.log(`   Scanner: ${scanAllTokens.name === 'scanAllTokens' ? '✅ REAL' : '⚠️  MOCK'}`);
  console.log(`   MIND Engine: ${runMindEngine.name === 'runMindEngine' ? '✅ REAL' : '⚠️  MOCK'}`);
  console.log(`   Base Trade: ${config.baseTradeAmount} SOL`);
  console.log(`   Daily Limit: ${config.maxDailySpend} SOL`);
  console.log(`   Min MIND Score: ${config.minMindScore}%`);
  
  const balance = await checkWalletBalance();
  console.log(`\n💰 Wallet Balance: ${balance.toFixed(4)} SOL`);
  
  console.log('\n⚠️  Starting in TEST MODE - no real trades will execute');
  console.log('   To enable live trading, change testMode to false\n');
  
  console.log('🚀 Starting trading cycles...\n');
  
  while (true) {
    await tradingCycle();
    await new Promise(resolve => setTimeout(resolve, config.cycleDelay));
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  console.log(`📊 Final Stats:`);
  console.log(`   Cycles: ${cycleCount}`);
  console.log(`   Buys: ${sessionStats.totalBuys}`);
  console.log(`   Sells: ${sessionStats.totalSells}`);
  console.log(`   Win/Loss: ${sessionStats.wins}W/${sessionStats.losses}L`);
  console.log(`   Active Positions: ${tradedTokens.size}`);
  console.log('\n✨ Thanks for using HootBot!');
  process.exit(0);
});

// Start
main().catch(console.error);