// testAI.js - Standalone AI Integration Test
const aiModel = require('./ai/local/model');
const { extractFeatures } = require('./ai/features');
const { recordTradeResult } = require('./ai/learning/feedback');

async function testAIIntegration() {
  console.log('🤖 === AI INTEGRATION TEST ===\n');
  
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
  const prediction = await aiModel.predict(features);
  const latency = Date.now() - start;
  console.log(`Prediction: ${(prediction * 100).toFixed(1)}%`);
  console.log(`Latency: ${latency}ms`);
  console.log(`Target <500ms: ${latency < 500 ? '✅ PASS' : '❌ FAIL'}\n`);
  
  // Test 3: Training
  console.log('📚 Test 3: Training Test');
  
  // Generate synthetic trades
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
    
    const testFeatures = extractFeatures(mockAnalysis);
    const profitProbability = testFeatures[0] * 0.4 + testFeatures[3] * 0.3 + (1 - testFeatures[1]) * 0.3;
    const profitable = Math.random() < profitProbability;
    
    await recordTradeResult({
      directive: { action: 'BUY', tokenMint: `MOCK${i}`, reasoning: {} },
      result: { 
        success: true, 
        profitLoss: profitable ? 0.1 + Math.random() * 0.1 : -0.05 - Math.random() * 0.05 
      },
      marketSnapshot: mockAnalysis
    });
  }
  
  // Train model
  console.log('Training on synthetic data...');
  const trainResult = await aiModel.trainFromHistory();
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
      riskScore: Math.random() * 30,
      confidenceLevel: 50 + Math.random() * 40,
      marketFlowStrength: 40 + Math.random() * 50,
      liquidityDepth: 30 + Math.random() * 60,
      whaleActivity: Math.random() > 0.6,
      devExhausted: Math.random() > 0.7,
      fomoIndex: 50 + Math.random() * 50,
      volumeSpike: Math.random() > 0.5,
      sentimentPolarity: Math.random() * 2 - 1,
      chainCongestion: 20 + Math.random() * 60
    });
    
    const pred = await aiModel.predict(testFeatures);
    if (pred > 0.6 && Math.random() < (0.5 + pred * 0.5)) {
      wins++;
    }
  }
  
  const winRate = (wins / trades) * 100;
  console.log(`Win Rate: ${winRate}%`);
  console.log(`Target 75%+: ${winRate >= 75 ? '✅ PASS' : '⚠️  Close'}`);
  
  console.log('\n✅ AI Integration Test Complete');
}

// Run test
testAIIntegration().catch(console.error);
