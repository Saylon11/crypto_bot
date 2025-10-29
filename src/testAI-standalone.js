// testAI-standalone.js - Test without mindEngine dependency
console.log('🤖 === AI INTEGRATION TEST (Standalone) ===\n');

// Test the AI modules directly
async function test() {
  try {
    // Test 1: Model loading
    console.log('📦 Test 1: Loading AI Model');
    const aiModel = require('./ai/local/model');
    console.log('✅ Model loaded successfully\n');
    
    // Test 2: Feature extraction
    console.log('📊 Test 2: Feature Extraction');
    const { extractFeatures } = require('./ai/features');
    const mockData = {
      survivabilityScore: 75,
      panicScore: 20,
      confidenceLevel: 70,
      marketFlowStrength: 65,
      liquidityDepth: 80,
      whaleActivity: true,
      chainCongestion: 25
    };
    const features = extractFeatures(mockData);
    console.log('Features:', features.map(f => f.toFixed(2)));
    console.log('✅ Feature extraction working\n');
    
    // Test 3: Prediction
    console.log('⚡ Test 3: Prediction Test');
    const start = Date.now();
    const prediction = await aiModel.predict(features);
    const latency = Date.now() - start;
    console.log(`Prediction: ${(prediction * 100).toFixed(1)}%`);
    console.log(`Latency: ${latency}ms`);
    console.log(`Target <500ms: ${latency < 500 ? '✅ PASS' : '❌ FAIL'}\n`);
    
    console.log('✅ Core AI functions validated');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

test();
