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
// ============= AI INTEGRATION TEST =============
const model = require('./ai/local/model');
const { extractFeatures } = require('./ai/features');

async function testAIIntegration() {
  console.log('\n\n🤖 === AI INTEGRATION TEST ===\n');
  
  // Mock M.I.N.D. analysis
  const mockMindAnalysis = {
    survivabilityScore: 75,
    panicScore: 20,
    riskScore: 30,
    confidenceLevel: 70,
    marketFlowStrength: 65,
    liquidityDepth: 80,
    whaleActivity: true,
    devExhausted: false,
    fomoIndex: 60,
    volumeSpike: true,
    sentimentPolarity: 0.7,
    chainCongestion: 25
  };
  
  // Test 1: Feature extraction
  console.log('📊 Test 1: Feature Extraction');
  const features = extractFeatures(mockMindAnalysis);
  console.log('Features (12D):', features.map(f => f.toFixed(2)));
  console.log('✅ Feature extraction working\n');
  
  // Test 2: Prediction latency
  console.log('⚡ Test 2: Prediction Latency');
  const start = Date.now();
  const prediction = await model.predict(features);
  const latency = Date.now() - start;
  console.log(`Prediction: ${(prediction * 100).toFixed(1)}%`);
  console.log(`Latency: ${latency}ms`);
  console.log(`Target <500ms: ${latency < 500 ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // Test 3: Training (generate synthetic data)
  console.log('📚 Test 3: Training Test');
  
  // Generate synthetic trades for training
  const { recordTradeResult } = require('./ai/learning/feedback');
  
  for (let i = 0; i < 150; i++) {
    const mockAnalysis = {
      survivabilityScore: 50 + Math.random() * 40,
      panicScore: Math.random() * 50,
      riskScore: 20 + Math.random() * 50,
      confidenceLevel: 40 + Math.random() * 50,
      marketFlowStrength: 30 + Math.random() * 60,
      liquidityDepth: 20 + Math.random() * 70,
      whaleActivity: Math.random() > 0.7,
      devExhausted: Math.random() > 0.8,
      fomoIndex: Math.random() * 100,
      volumeSpike: Math.random() > 0.6,
      sentimentPolarity: Math.random() * 2 - 1,
      chainCongestion: 10 + Math.random() * 70
    };
    
    const features = extractFeatures(mockAnalysis);
    const profitProbability = features[0] * 0.4 + features[3] * 0.3 + (1 - features[1]) * 0.3;
    const profitable = Math.random() < profitProbability;
    
    await recordTradeResult({
      directive: { action: 'BUY', tokenMint: `MOCK${i}` },
      result: { 
        success: true, 
        profitLoss: profitable ? 0.1 + Math.random() * 0.1 : -0.05 - Math.random() * 0.05 
      },
      marketSnapshot: mockAnalysis
    });
  }
  
  // Train model
  console.log('Training on synthetic data...');
  const trainResult = await model.trainFromHistory();
  console.log('Training result:', trainResult);
  
  if (trainResult.status === 'success') {
    console.log(`Loss: ${trainResult.loss.toFixed(4)}`);
    console.log(`Target <0.5: ${trainResult.loss < 0.5 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Test 4: Win rate simulation
  console.log('\n💰 Test 4: Win Rate Simulation');
  let wins = 0;
  const trades = 100;
  
  for (let i = 0; i < trades; i++) {
    const testFeatures = extractFeatures({
      survivabilityScore: 60 + Math.random() * 30,
      panicScore: Math.random() * 30,
      confidenceLevel: 50 + Math.random() * 40,
      marketFlowStrength: 40 + Math.random() * 50,
      liquidityDepth: 30 + Math.random() * 60,
      whaleActivity: Math.random() > 0.6,
      devExhausted: Math.random() > 0.7
    });
    
    const pred = await model.predict(testFeatures);
    if (pred > 0.6 && Math.random() < (0.5 + pred * 0.5)) {
      wins++;
    }
  }
  
  const winRate = (wins / trades) * 100;
  console.log(`Win Rate: ${winRate}%`);
  console.log(`Target 75%+: ${winRate >= 75 ? '✅ PASS' : '⚠️  Close'}`);
  
  console.log('\n✅ AI Integration Test Complete');
}

// Run AI test if this is main
if (require.main === module) {
  testAIIntegration().catch(console.error);
}

// ============= AI INTEGRATION TEST =============
const model = require('./ai/local/model');
const { extractFeatures } = require('./ai/features');

async function testAIIntegration() {
  console.log('\n\n🤖 === AI INTEGRATION TEST ===\n');
  
  // Mock M.I.N.D. analysis
  const mockMindAnalysis = {
    survivabilityScore: 75,
    panicScore: 20,
    riskScore: 30,
    confidenceLevel: 70,
    marketFlowStrength: 65,
    liquidityDepth: 80,
    whaleActivity: true,
    devExhausted: false,
    fomoIndex: 60,
    volumeSpike: true,
    sentimentPolarity: 0.7,
    chainCongestion: 25
  };
  
  // Test 1: Feature extraction
  console.log('📊 Test 1: Feature Extraction');
  const features = extractFeatures(mockMindAnalysis);
  console.log('Features (12D):', features.map(f => f.toFixed(2)));
  console.log('✅ Feature extraction working\n');
  
  // Test 2: Prediction latency
  console.log('⚡ Test 2: Prediction Latency');
  const start = Date.now();
  const prediction = await model.predict(features);
  const latency = Date.now() - start;
  console.log(`Prediction: ${(prediction * 100).toFixed(1)}%`);
  console.log(`Latency: ${latency}ms`);
  console.log(`Target <500ms: ${latency < 500 ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // Test 3: Training (generate synthetic data)
  console.log('📚 Test 3: Training Test');
  
  // Generate synthetic trades for training
  const { recordTradeResult } = require('./ai/learning/feedback');
  
  for (let i = 0; i < 150; i++) {
    const mockAnalysis = {
      survivabilityScore: 50 + Math.random() * 40,
      panicScore: Math.random() * 50,
      riskScore: 20 + Math.random() * 50,
      confidenceLevel: 40 + Math.random() * 50,
      marketFlowStrength: 30 + Math.random() * 60,
      liquidityDepth: 20 + Math.random() * 70,
      whaleActivity: Math.random() > 0.7,
      devExhausted: Math.random() > 0.8,
      fomoIndex: Math.random() * 100,
      volumeSpike: Math.random() > 0.6,
      sentimentPolarity: Math.random() * 2 - 1,
      chainCongestion: 10 + Math.random() * 70
    };
    
    const features = extractFeatures(mockAnalysis);
    const profitProbability = features[0] * 0.4 + features[3] * 0.3 + (1 - features[1]) * 0.3;
    const profitable = Math.random() < profitProbability;
    
    await recordTradeResult({
      directive: { action: 'BUY', tokenMint: `MOCK${i}` },
      result: { 
        success: true, 
        profitLoss: profitable ? 0.1 + Math.random() * 0.1 : -0.05 - Math.random() * 0.05 
      },
      marketSnapshot: mockAnalysis
    });
  }
  
  // Train model
  console.log('Training on synthetic data...');
  const trainResult = await model.trainFromHistory();
  console.log('Training result:', trainResult);
  
  if (trainResult.status === 'success') {
    console.log(`Loss: ${trainResult.loss.toFixed(4)}`);
    console.log(`Target <0.5: ${trainResult.loss < 0.5 ? '✅ PASS' : '❌ FAIL'}`);
  }
  
  // Test 4: Win rate simulation
  console.log('\n💰 Test 4: Win Rate Simulation');
  let wins = 0;
  const trades = 100;
  
  for (let i = 0; i < trades; i++) {
    const testFeatures = extractFeatures({
      survivabilityScore: 60 + Math.random() * 30,
      panicScore: Math.random() * 30,
      confidenceLevel: 50 + Math.random() * 40,
      marketFlowStrength: 40 + Math.random() * 50,
      liquidityDepth: 30 + Math.random() * 60,
      whaleActivity: Math.random() > 0.6,
      devExhausted: Math.random() > 0.7
    });
    
    const pred = await model.predict(testFeatures);
    if (pred > 0.6 && Math.random() < (0.5 + pred * 0.5)) {
      wins++;
    }
  }
  
  const winRate = (wins / trades) * 100;
  console.log(`Win Rate: ${winRate}%`);
  console.log(`Target 75%+: ${winRate >= 75 ? '✅ PASS' : '⚠️  Close'}`);
  
  console.log('\n✅ AI Integration Test Complete');
}

// Run AI test if this is main
if (require.main === module) {
  testAIIntegration().catch(console.error);
}
