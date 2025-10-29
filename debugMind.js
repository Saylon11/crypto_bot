// HootBot/debugMind.js
// Quick test to see what's causing the MIND engine error

const { runMindEngine } = require('./src/mindEngine');

async function debugMind() {
  console.log('🧪 Testing MIND Engine...\n');
  
  // Set a test token
  process.env.TEST_TOKEN_ADDRESS = 'JAKfrKQnENQ4JtQmmHG7gcVgoZVzdYtK96fcgRk1pump';
  
  try {
    console.log('Running MIND analysis...');
    const result = await runMindEngine();
    
    console.log('\n✅ MIND Result:');
    console.log('Survivability:', result.survivabilityScore);
    console.log('Action:', result.tradeSuggestion?.action || result.suggestedAction);
    console.log('Risk:', result.riskLevel);
    
  } catch (error) {
    console.error('\n❌ MIND Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugMind();