// /Users/owner/Desktop/HootBot/src/demo.js
// Test feedback loop integration - Simulates Solana trades

const { executeTrade } = require('./execution/smartTrader');
const { getPerformanceStats } = require('./ai/learning/feedback');

console.log('🚀 HootBot Feedback Loop Integration Test\n');

// Mock market snapshot (M.I.N.D.-like data)
function generateMockMarketSnapshot() {
  return {
    survivabilityScore: 60 + Math.random() * 30, // 60-90
    panicScore: Math.random() * 40, // 0-40
    confidenceLevel: 50 + Math.random() * 40, // 50-90
    riskScore: Math.random() * 60, // 0-60
    marketFlowStrength: 40 + Math.random() * 40, // 40-80
    liquidityDepth: 30 + Math.random() * 50, // 30-80
    whaleActivity: Math.random() > 0.7,
    devExhausted: Math.random() > 0.8,
    volumeTrend: ['increasing', 'stable', 'decreasing'][Math.floor(Math.random() * 3)],
    dominantEmotion: ['greed', 'neutral', 'fear'][Math.floor(Math.random() * 3)]
  };
}

// Test tokens
const testTokens = [
  'BKjx5R9AuxXMUVM2hSxu1CkPSSdBCzJraMzEc8WZ7tvh', // Example token
  'DezXAZ8z7PnrnRJjz3wXBoXwgRhEo468VVhaqNj5Mj2', // Another example
  'So11111111111111111111111111111111111111112' // Wrapped SOL
];

// Simulate offline mode
let OFFLINE_MODE = false;

// Mock network calls for offline testing
const originalBuy = require('./trading/tradeExecutor').initiateCoordinatedBuy;
const originalSell = require('./trading/sellExecutor').initiateCoordinatedSell;

if (OFFLINE_MODE) {
  // Override with mocks
  require('./trading/tradeExecutor').initiateCoordinatedBuy = async (params) => {
    console.log('🔌 OFFLINE MODE: Simulating BUY');
    return Math.random() > 0.1; // 90% success rate
  };
  
  require('./trading/sellExecutor').initiateCoordinatedSell = async (params) => {
    console.log('🔌 OFFLINE MODE: Simulating SELL');
    const profitLoss = Math.random() > 0.3 ? (Math.random() * 0.3) : -(Math.random() * 0.1);
    return { success: true, profitLoss };
  };
}

// Run test trades
async function runTestTrades() {
  console.log('📊 Running 10 test trades...\n');
  
  for (let i = 0; i < 10; i++) {
    const tokenMint = testTokens[Math.floor(Math.random() * testTokens.length)];
    const marketSnapshot = generateMockMarketSnapshot();
    
    console.log(`\n--- Trade ${i + 1} ---`);
    console.log(`Token: ${tokenMint.slice(0, 8)}...`);
    console.log(`Market State: Survivability=${marketSnapshot.survivabilityScore.toFixed(0)}%, Panic=${marketSnapshot.panicScore.toFixed(0)}%`);
    
    try {
      const startTime = Date.now();
      const result = await executeTrade(tokenMint, marketSnapshot);
      const executionTime = Date.now() - startTime;
      
      console.log(`✅ Trade executed: ${result.action}`);
      console.log(`⏱️  Execution time: ${executionTime}ms`);
      
      if (executionTime > 500) {
        console.warn('⚠️  WARNING: Execution exceeded 500ms target!');
      }
      
    } catch (error) {
      console.error(`❌ Trade failed: ${error.message}`);
    }
    
    // Small delay between trades
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test offline resilience
async function testOfflineMode() {
  console.log('\n\n🔌 Testing Offline Resilience...\n');
  
  OFFLINE_MODE = true;
  
  // Redefine mocks for offline
  require('./trading/tradeExecutor').initiateCoordinatedBuy = async (params) => {
    console.log('🔌 OFFLINE: Mock BUY execution');
    return true;
  };
  
  require('./trading/sellExecutor').initiateCoordinatedSell = async (params) => {
    console.log('🔌 OFFLINE: Mock SELL execution');
    return { success: true, profitLoss: 0.15 };
  };
  
  // Run 3 offline trades
  for (let i = 0; i < 3; i++) {
    const tokenMint = testTokens[0];
    const marketSnapshot = generateMockMarketSnapshot();
    
    console.log(`\nOffline Trade ${i + 1}`);
    
    try {
      await executeTrade(tokenMint, marketSnapshot);
      console.log('✅ Offline trade recorded successfully');
    } catch (error) {
      console.error(`❌ Offline trade failed: ${error.message}`);
    }
  }
  
  OFFLINE_MODE = false;
}

// Main test execution
async function main() {
  try {
    // Run online trades
    await runTestTrades();
    
    // Test offline mode
    await testOfflineMode();
    
    // Display stats
    console.log('\n\n📈 Performance Statistics:');
    const stats = getPerformanceStats();
    console.log(`Total Trades: ${stats.totalTrades}`);
    console.log(`Win Rate: ${stats.winRate.toFixed(1)}%`);
    console.log(`Avg Profit: ${stats.avgProfit.toFixed(2)}%`);
    console.log(`Avg Latency: ${stats.avgLatency.toFixed(0)}ms`);
    
    console.log('\n✅ Feedback loop integration test complete!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
main();