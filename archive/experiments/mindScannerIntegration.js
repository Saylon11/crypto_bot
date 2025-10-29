// src/modules/mindScannerIntegration.js

require('dotenv').config();

const { scanTokens } = require('./tokenScanner');
const { runMindEngine } = require('../mindEngine');
const { initiateCoordinatedBuy } = require('../pumpTools/tradeExecutor');
const { Connection } = require('@solana/web3.js');
const { getSessionAnalyzer } = require('../sessionAnalyzer');

// Configuration
const config = {
  // Scanner settings
  scanInterval: 30 * 1000,         // 30 seconds between scans
  maxTokensPerScan: 5,             // Analyze top 5 tokens
  minScore: 60,                    // Minimum scanner score
  
  // Trading settings  
  minMindScore: 40,                // Minimum MIND survivability for trading
  baseTradeAmount: 0.01,           // Base SOL amount per trade
  maxTradeAmount: 0.1,             // Maximum SOL per trade
  
  // Session limits
  maxTokensPerSession: 10,         // Max new tokens to trade per session
  maxDailySpend: 1,                // Maximum SOL to spend daily
  
  // Modes
  autoTrade: false,                // Set true for automatic trading
  testMode: true,                  // Set false for real trades
  verboseLogging: true,            // Detailed logs
};

// Session tracking
let sessionStats = {
  tokensScanned: 0,
  tokensAnalyzed: 0,
  tokensBought: 0,
  totalSpent: 0,
  startTime: Date.now(),
  tradedTokens: new Set()
};

/**
 * Main scanner integration loop
 */
async function runScannerIntegration() {
  console.log('🦉 HootBot MIND Scanner Integration v1.0');
  console.log('=========================================');
  console.log(`Mode: ${config.autoTrade ? '🔥 AUTO-TRADE' : '👀 ANALYSIS ONLY'}`);
  console.log(`Trade Size: ${config.baseTradeAmount} SOL`);
  console.log(`Min MIND Score: ${config.minMindScore}%`);
  console.log('=========================================\n');
  
  const connection = new Connection(
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );
  
  // Initialize session analyzer
  const analyzer = getSessionAnalyzer();
  
  // Save original token for restoration
  const originalToken = process.env.TARGET_TOKEN_MINT;
  
  while (true) {
    try {
      await scanAndAnalyzeCycle(connection, originalToken, analyzer);
      
      // Increment cycle counter
      analyzer.incrementCycle();
      
      // Show session stats with analysis
      const perfSummary = analyzer.getPerformanceSummary();
      console.log('\n📊 Session Performance:');
      console.log(`   Runtime: ${perfSummary.runtime}`);
      console.log(`   Tokens Analyzed: ${perfSummary.tokensAnalyzed}`);
      console.log(`   Avg Bull Score: ${perfSummary.averageBullScore}`);
      console.log(`   Trade Opportunities: ${perfSummary.tradeOpportunities}`);
      console.log(`   Success Rate: ${perfSummary.successRate}`);
      console.log(`   Net Profit: ${perfSummary.netProfit}`);
      
      // Check limits
      if (sessionStats.totalSpent >= config.maxDailySpend) {
        console.log('\n⚠️ Daily spending limit reached!');
        if (!config.testMode) {
          console.log('Shutting down for safety...');
          break;
        }
      }
      
      if (sessionStats.tokensBought >= config.maxTokensPerSession) {
        console.log('\n⚠️ Session token limit reached!');
        console.log('Consider taking profits before continuing...');
      }
      
      console.log(`\n⏰ Next scan in ${config.scanInterval / 60000} minutes...`);
      console.log('─'.repeat(50) + '\n');
      
      await sleep(config.scanInterval);
      
    } catch (error) {
      console.error('❌ Cycle error:', error.message);
      analyzer.logError(error, 'main cycle');
      await sleep(30000); // Wait 30s on error
    }
  }
  
  // Restore original token
  if (originalToken) {
    process.env.TARGET_TOKEN_MINT = originalToken;
  }
}

/**
 * Single scan and analyze cycle
 */
async function scanAndAnalyzeCycle(connection, originalToken, analyzer) {
  console.log(`\n🔍 Scanning for opportunities... [${new Date().toLocaleTimeString()}]`);
  
  // Scan for tokens
  const tokens = await scanTokens(connection);
  sessionStats.tokensScanned += tokens.length;
  
  // Log token scan and API call
  analyzer.logTokenScan(tokens);
  analyzer.logApiCall('gecko');
  
  if (tokens.length === 0) {
    console.log('No tokens found in this scan.');
    return;
  }
  
  // Display found tokens
  console.log(`\n📋 Found ${tokens.length} tokens:`);
  const topTokens = tokens.slice(0, config.maxTokensPerScan);
  
  topTokens.forEach((token, i) => {
    console.log(`${i + 1}. ${token.symbol} - Score: ${token.score}/100`);
    console.log(`   Source: ${token.source}`);
    console.log(`   Volume: $${token.volume?.toLocaleString() || 'N/A'}`);
  });
  
  // Analyze top tokens with MIND
  for (const token of topTokens) {
    if (token.score < config.minScore) {
      console.log(`\n⏭️ Skipping ${token.symbol} - score too low (${token.score})`);
      continue;
    }
    
    if (sessionStats.tradedTokens.has(token.mint)) {
      console.log(`\n⏭️ Skipping ${token.symbol} - already traded this session`);
      continue;
    }
    
    console.log(`\n🧠 Analyzing ${token.symbol} with MIND...`);
    
    try {
      // Set current token for MIND analysis
      process.env.CURRENT_SCAN_TOKEN = token.mint;
      process.env.TOKEN_SYMBOL = token.symbol;
      
      // Add delay to respect rate limits
      await sleep(2000); // 2 second delay between API calls
      
      // Run MIND analysis
      const mindReport = await runMindEngine();
      sessionStats.tokensAnalyzed++;
      
      // Log MIND analysis
      analyzer.logMindAnalysis(token, mindReport);
      analyzer.logApiCall('helius');
      
      // Display MIND results
      console.log(`\n📊 MIND Analysis for ${token.symbol}:`);
      console.log(`   Survivability: ${mindReport.survivabilityScore}%`);
      console.log(`   Action: ${mindReport.tradeSuggestion.action}`);
      console.log(`   Bull Score: ${mindReport.bullScore}/100`);
      console.log(`   Risk: ${mindReport.riskLevel}`);
      console.log(`   Reason: ${mindReport.tradeSuggestion.reason}`);
      
      // Check if we should trade
      if (shouldTrade(mindReport, token)) {
        console.log(`\n✅ ${token.symbol} meets all criteria!`);
        
        if (config.autoTrade && !config.testMode) {
          // Execute real trade
          const tradeAmount = calculateTradeAmount(mindReport);
          console.log(`💰 Executing trade: ${tradeAmount} SOL`);
          
          try {
            await initiateCoordinatedBuy(tradeAmount);
            sessionStats.tokensBought++;
            sessionStats.totalSpent += tradeAmount;
            sessionStats.tradedTokens.add(token.mint);
            console.log(`✅ Trade executed successfully!`);
            
            // Log successful trade
            analyzer.logTrade(token, tradeAmount, 'BUY', true);
          } catch (error) {
            console.error(`❌ Trade failed:`, error.message);
          }
        } else {
          // Test mode
          console.log(`🧪 TEST MODE: Would buy ${calculateTradeAmount(mindReport)} SOL`);
          sessionStats.tokensBought++;
          sessionStats.totalSpent += calculateTradeAmount(mindReport);
          sessionStats.tradedTokens.add(token.mint);
          
          // Log test trade
          analyzer.logTrade(token, calculateTradeAmount(mindReport), 'BUY', true);
        }
      } else {
        console.log(`\n❌ ${token.symbol} does not meet trading criteria`);
      }
      
    } catch (error) {
      console.error(`\n❌ Error analyzing ${token.symbol}:`, error.message);
    }
    
    // Small delay between analyses
    await sleep(5000);
  }
  
  // Restore original token
  if (originalToken) {
    process.env.TARGET_TOKEN_MINT = originalToken;
    delete process.env.CURRENT_SCAN_TOKEN;
  }
}

/**
 * Determine if we should trade based on MIND analysis
 */
function shouldTrade(mindReport, token) {
  // Check basic criteria
  if (mindReport.tradeSuggestion.action !== 'BUY') return false;
  if (mindReport.survivabilityScore < config.minMindScore) return false;
  if (mindReport.riskLevel === 'critical') return false;
  
  // Check spending limits
  if (sessionStats.totalSpent >= config.maxDailySpend) return false;
  if (sessionStats.tokensBought >= config.maxTokensPerSession) return false;
  
  // Additional safety checks
  if (mindReport.panicScore > 70) return false;
  if (mindReport.devExhaustion?.exhausted === false && 
      mindReport.devExhaustion?.remainingPercentage < 20) return false;
  
  return true;
}

/**
 * Calculate trade amount based on MIND confidence
 */
function calculateTradeAmount(mindReport) {
  let amount = config.baseTradeAmount;
  
  // Scale based on bull score
  if (mindReport.bullScore >= 80) {
    amount *= 2;
  } else if (mindReport.bullScore >= 70) {
    amount *= 1.5;
  } else if (mindReport.bullScore >= 60) {
    amount *= 1.25;
  }
  
  // Scale based on suggested percentage
  const suggestedMultiplier = (mindReport.tradeSuggestion.percentage || 25) / 25;
  amount *= Math.min(suggestedMultiplier, 2);
  
  // Cap at maximum
  return Math.min(amount, config.maxTradeAmount);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if called directly
if (require.main === module) {
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down gracefully...');
    const analyzer = getSessionAnalyzer();
    analyzer.endSession();
    process.exit(0);
  });
  
  runScannerIntegration()
    .then(() => {
      console.log('\n✅ Scanner integration completed');
      const analyzer = getSessionAnalyzer();
      analyzer.endSession();
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Fatal error:', error);
      const analyzer = getSessionAnalyzer();
      analyzer.logError(error, 'fatal');
      analyzer.endSession();
      process.exit(1);
    });
}

module.exports = {
  runScannerIntegration,
  scanAndAnalyzeCycle,
  shouldTrade,
  calculateTradeAmount
};