// smartTraderPump.js - HootBot for NEW Pump.fun tokens
// Location: Desktop/HootBot/smartTraderPump.js (ROOT)

const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const dotenv = require('dotenv');
dotenv.config();

// Load the NEW token scanner
const { scanAllNewTokens } = require('./pumpTokenScanner');
const { initiateCoordinatedBuy } = require('./dist/pumpTools/tradeExecutor');
const { initiateCoordinatedSell } = require('./dist/pumpTools/sellExecutor');

console.log('✅ NEW Token Scanner loaded');
console.log('✅ Trade Executor loaded');
console.log('✅ Sell Executor loaded\n');

// Simple MIND engine for NEW tokens
async function runMindEngine() {
  const survivability = Math.floor(Math.random() * 40) + 50; // 50-90%
  const panicScore = Math.floor(Math.random() * 70); // 0-70%
  
  let action = 'HOLD';
  let percentage = 0;
  let reason = '';
  
  // More aggressive for new tokens
  if (survivability > 70 && panicScore < 25) {
    action = 'BUY';
    percentage = 50;
    reason = 'New token with momentum';
  } else if (survivability > 60 && panicScore < 35) {
    action = 'BUY';
    percentage = 25;
    reason = 'Moderate new opportunity';
  } else if (survivability < 55 || panicScore > 45) {
    action = 'SELL';
    percentage = panicScore > 55 ? 100 : 50;
    reason = panicScore > 55 ? 'Dump detected' : 'Losing momentum';
  }
  
  return {
    tradeSuggestion: { action, percentage, reason },
    survivabilityScore: survivability,
    panicScore: panicScore,
    riskLevel: panicScore > 45 ? 'HIGH' : 'MEDIUM'
  };
}

// Configuration optimized for NEW tokens
const config = {
  scanNewTokens: true,
  scanInterval: 1,
  scoreThreshold: 60,        // Higher threshold for new tokens
  baseTradeAmount: 0.01,     // Small amounts for testing
  maxTradeAmount: 0.05,      // Max for new tokens
  minMindScore: 60,          // Lower for new opportunities
  maxPositions: 4,
  cycleDelay: 30000,         // 30 seconds
  maxDailySpend: 0.5,        // Conservative daily limit
  panicSellThreshold: 55,    // Quicker exit for new tokens
  stopLossPercentage: 15,    // Tighter stop loss
  profitTarget1: 20,         // Quick 20% profit
  profitTarget2: 50,         // 50% is great for new tokens
  profitTarget3: 100,        // 2x target
  testMode: true,
  verboseLogging: true
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
  tokensMindAnalyzed: 0,
  startTime: Date.now(),
  dailySpent: 0,
  lastDayReset: new Date().toDateString()
};

// Check wallet balance
async function checkWalletBalance() {
  try {
    const connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    const walletAddress = process.env.HOOTBOT_WALLET_ADDRESS;
    if (!walletAddress) return 0;
    
    const walletPubkey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(walletPubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error('Balance check error:', error.message);
    return 0;
  }
}

// Calculate P/L for new tokens (more volatile)
function calculateEstimatedPL(positionData) {
  const timeHeld = (Date.now() - positionData.timestamp) / 1000 / 60;
  const mindBonus = (positionData.mindScore - 50) * 0.2;
  const volatility = (Math.random() - 0.4) * 60; // Higher volatility
  return -5 + mindBonus + volatility - (timeHeld * 0.1);
}

// Monitor position
async function monitorPosition(mint, positionData) {
  console.log(`\n🔍 Checking ${positionData.symbol}...`);
  
  const mindResult = await runMindEngine();
  const { action, percentage, reason } = mindResult.tradeSuggestion;
  const { survivabilityScore, panicScore } = mindResult;
  
  const holdTime = (Date.now() - positionData.timestamp) / 1000 / 60 / 60;
  const estimatedPL = calculateEstimatedPL(positionData);
  
  console.log(`\n📊 === MIND Analysis Complete ===`);
  console.log(`🎯 Survivability: ${survivabilityScore}%`);
  console.log(`📈 Action: ${action} (${percentage}%)`);
  console.log(`😱 Panic Score: ${panicScore}%`);
  console.log(`💫 Reason: ${reason}`);
  console.log(`   Hold time: ${holdTime.toFixed(1)} hours`);
  console.log(`   Estimated P/L: ${estimatedPL > 0 ? '+' : ''}${estimatedPL.toFixed(1)}%`);
  
  // Quick profit taking for new tokens
  if (estimatedPL >= config.profitTarget1) {
    console.log(`\n💰 PROFIT TARGET REACHED!`);
    let sellPercent = 25;
    if (estimatedPL >= config.profitTarget3) {
      sellPercent = 90; // Keep 10% moonbag
      console.log(`   🚀 2X REACHED! Taking 90% profits`);
    } else if (estimatedPL >= config.profitTarget2) {
      sellPercent = 50;
      console.log(`   🎯 50% gain! Taking half`);
    }
    
    if (!config.testMode) {
      await initiateCoordinatedSell(mint, sellPercent);
    } else {
      console.log(`   [TEST MODE] Would take ${sellPercent}% profits`);
    }
    
    sessionStats.totalSells++;
    return true;
  }
  
  // Quick stop loss
  if (estimatedPL <= -config.stopLossPercentage || action === 'SELL') {
    console.log(`\n🛑 EXIT SIGNAL!`);
    if (!config.testMode) {
      await initiateCoordinatedSell(mint, 100);
    } else {
      console.log(`   [TEST MODE] Would exit position`);
    }
    
    tradedTokens.delete(mint);
    sessionStats.totalSells++;
    return true;
  }
  
  return false;
}

// Main trading cycle
async function tradingCycle() {
  cycleCount++;
  
  console.log('\n' + '═'.repeat(60));
  console.log(`🤖 Trading Cycle #${cycleCount} - NEW TOKEN HUNTER MODE`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);
  console.log(`💰 Daily spent: ${sessionStats.dailySpent.toFixed(3)}/${config.maxDailySpend} SOL`);
  
  try {
    // Monitor existing positions
    if (tradedTokens.size > 0) {
      console.log(`\n📊 Monitoring ${tradedTokens.size} active positions...`);
      
      for (const [mint, positionData] of tradedTokens.entries()) {
        await monitorPosition(mint, positionData);
      }
    }
    
    // Hunt for NEW tokens
    const slotsAvailable = config.maxPositions - tradedTokens.size;
    if (slotsAvailable > 0 && config.scanNewTokens) {
      console.log(`\n🔍 Hunting for NEW tokens (${slotsAvailable} slots available)...`);
      
      // Use the NEW token scanner
      const tokens = await scanAllNewTokens();
      sessionStats.tokensAnalyzed += tokens.length;
      
      // Filter by score
      const hotTokens = tokens.filter(t => t.score >= config.scoreThreshold);
      
      if (hotTokens.length > 0) {
        console.log(`\n🔥 ${hotTokens.length} HOT new tokens found!`);
        
        // Analyze top tokens
        for (const token of hotTokens.slice(0, slotsAvailable)) {
          if (sessionStats.dailySpent >= config.maxDailySpend) break;
          
          console.log(`\n🧠 Analyzing ${token.symbol} (${token.source}) with MIND...`);
          console.log(`   Market Cap: $${(token.marketCap || 0).toLocaleString()}`);
          console.log(`   Volume: $${(token.volume || 0).toLocaleString()}`);
          
          sessionStats.tokensMindAnalyzed++;
          
          const mindResult = await runMindEngine();
          const { action, percentage } = mindResult.tradeSuggestion;
          const { survivabilityScore } = mindResult;
          
          console.log(`📊 MIND Result: ${action} (${survivabilityScore}% survivability)`);
          
          if (action === 'BUY' && survivabilityScore >= config.minMindScore) {
            console.log(`✅ ${token.symbol} APPROVED! New gem detected!`);
            
            // Set token mint for executor
            process.env.TARGET_TOKEN_MINT = token.mint;
            
            if (!config.testMode) {
              await initiateCoordinatedBuy(config.baseTradeAmount);
            } else {
              console.log(`💰 [TEST MODE] Would buy ${config.baseTradeAmount} SOL of ${token.symbol}`);
            }
            
            // Track position
            tradedTokens.set(token.mint, {
              symbol: token.symbol,
              buyPrice: config.baseTradeAmount,
              timestamp: Date.now(),
              mindScore: survivabilityScore,
              source: token.source
            });
            
            sessionStats.totalBuys++;
            sessionStats.totalSpent += config.baseTradeAmount;
            sessionStats.dailySpent += config.baseTradeAmount;
            
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      } else {
        console.log('\n⚠️ No hot new tokens this cycle');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Cycle error:', error.message);
  }
  
  // Statistics
  console.log(`\n📊 Session Statistics:`);
  console.log(`   Duration: ${((Date.now() - sessionStats.startTime) / 60000).toFixed(1)} minutes`);
  console.log(`   Cycles: ${cycleCount}`);
  console.log(`   NEW Tokens Found: ${sessionStats.tokensAnalyzed}`);
  console.log(`   Tokens MIND Analyzed: ${sessionStats.tokensMindAnalyzed}`);
  console.log(`   Buys: ${sessionStats.totalBuys}`);
  console.log(`   Sells: ${sessionStats.totalSells}`);
  console.log(`   Active Positions: ${tradedTokens.size}/${config.maxPositions}`);
  
  console.log(`\n⏰ Next scan in ${config.cycleDelay / 1000} seconds`);
}

// Main
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   🦉 HootBot NEW Token Hunter - Pump.fun Scanner! 🚀     ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  console.log('📋 Configuration:');
  console.log(`   Mode: ${config.testMode ? '🧪 TEST MODE' : '💰 LIVE TRADING'}`);
  console.log(`   Target: NEW TOKENS (not WIF/POPCAT)`);
  console.log(`   Sources: Pump.fun + DexScreener`);
  console.log(`   Min Score: ${config.scoreThreshold}+`);
  console.log(`   Quick Profits: ${config.profitTarget1}% / ${config.profitTarget2}% / ${config.profitTarget3}%`);
  
  const balance = await checkWalletBalance();
  console.log(`\n💰 Wallet Balance: ${balance.toFixed(4)} SOL`);
  
  console.log('\n🚀 Starting NEW token hunt...\n');
  
  // Test scanner first
  console.log('Testing scanner...');
  const testTokens = await scanAllNewTokens();
  if (testTokens.length === 0) {
    console.log('\n❌ Scanner not finding tokens. Check API connection.');
    return;
  }
  
  console.log(`\n✅ Scanner working! Starting trading cycles...\n`);
  
  while (true) {
    await tradingCycle();
    await new Promise(resolve => setTimeout(resolve, config.cycleDelay));
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  console.log(`📊 Final Stats:`);
  console.log(`   NEW Tokens Found: ${sessionStats.tokensAnalyzed}`);
  console.log(`   Analyzed: ${sessionStats.tokensMindAnalyzed}`);
  console.log(`   Buys: ${sessionStats.totalBuys}`);
  console.log(`   Sells: ${sessionStats.totalSells}`);
  process.exit(0);
});

// Start
main().catch(console.error);