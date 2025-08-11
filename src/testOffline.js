console.log('🔌 Testing Offline AI Functionality\n');

// Test without any network deps
const aiModel = require('./ai/local/model');

// Simple offline test
async function offlineTest() {
  const testVector = [0.75, 0.2, 0.3, 0.7, 0.8, 0.85, 1, 0, 0.9, 1, 0.8, 0.15];
  console.log('Testing prediction offline...');
  
  const start = Date.now();
  const prediction = await aiModel.predict(testVector);
  const latency = Date.now() - start;
  
  console.log(`Prediction: ${(prediction * 100).toFixed(1)}%`);
  console.log(`Latency: ${latency}ms`);
  console.log('✅ Offline prediction working');
}

offlineTest().catch(console.error);
