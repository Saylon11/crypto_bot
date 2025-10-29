// quickTest.js - Quick test using .env.scanner
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

console.log('🧪 Quick HootBot Test with .env.scanner\n');

// Load .env.scanner instead of .env
const scannerEnvPath = path.join(__dirname, '.env.scanner');
if (fs.existsSync(scannerEnvPath)) {
  const result = dotenv.config({ path: scannerEnvPath });
  if (result.error) {
    console.error('❌ Error loading .env.scanner:', result.error);
  } else {
    console.log('✅ Loaded .env.scanner successfully');
  }
} else {
  console.error('❌ .env.scanner not found!');
  process.exit(1);
}

// Display loaded configuration
console.log('\n📋 Loaded Configuration:');
console.log(`HELIUS_RPC_URL: ${process.env.HELIUS_RPC_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`HOOTBOT_WALLET_ADDRESS: ${process.env.HOOTBOT_WALLET_ADDRESS || 'Not set'}`);
console.log(`TEST_TOKEN_ADDRESS: ${process.env.TEST_TOKEN_ADDRESS || 'Not set'}`);
console.log(`IGNORE_TOKENS: ${process.env.IGNORE_TOKENS || 'None'}`);

// Test M.I.N.D. Engine
console.log('\n🧠 Testing M.I.N.D. Engine...');
try {
  const { runMindEngine } = require('./src/mindEngine');
  
  // Set a test token if none specified
  if (!process.env.TEST_TOKEN_ADDRESS) {
    process.env.TEST_TOKEN_ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC
  }
  
  const result = await runMindEngine();
  console.log('✅ M.I.N.D. Analysis completed');
  console.log(`   Survivability: ${result.survivabilityScore}%`);
  console.log(`   Action: ${result.tradeSuggestion.action}`);
  console.log(`   Risk: ${result.riskLevel}`);
  
} catch (error) {
  console.error('❌ M.I.N.D. Engine error:', error.message);
}

console.log('\n✨ Test complete! Ready to run:');
console.log('   export $(cat .env.scanner | grep -v "^#" | xargs) && node src/pumpTools/smartTrader.js');