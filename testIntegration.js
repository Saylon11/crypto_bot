// testIntegration.js - Test HootBot component integration
const path = require('path');
const fs = require('fs');

console.log('🧪 HootBot Integration Test');
console.log('==========================\n');

// Test 1: Check file structure
console.log('📁 Checking file structure...');
const requiredFiles = [
  'src/mindEngine.js',
  'src/pumpTools/smartTrader.js',
  'src/pumpTools/tokenScanner.js',
  'src/pumpTools/tradeExecutor.js',
  'src/pumpTools/sellExecutor.js',
  '.env'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

if (!allFilesExist) {
  console.log('\n❌ Missing required files. Please check your setup.');
  process.exit(1);
}

// Test 2: Load and test mindEngine
console.log('\n🧠 Testing M.I.N.D. Engine...');
try {
  const { runMindEngine } = require('./src/mindEngine');
  console.log('  ✅ mindEngine loaded successfully');
  
  // Run a quick test
  runMindEngine().then(result => {
    console.log(`  ✅ M.I.N.D. analysis completed`);
    console.log(`     Survivability: ${result.survivabilityScore}%`);
    console.log(`     Action: ${result.tradeSuggestion.action}`);
  }).catch(err => {
    console.log(`  ❌ M.I.N.D. analysis failed: ${err.message}`);
  });
} catch (err) {
  console.log(`  ❌ Failed to load mindEngine: ${err.message}`);
}

// Test 3: Check environment variables
console.log('\n🔐 Checking environment variables...');
require('dotenv').config();

const requiredEnvVars = [
  'HELIUS_RPC_URL',
  'HOOTBOT_WALLET_ADDRESS',
  'TEST_TOKEN_ADDRESS'
];

requiredEnvVars.forEach(varName => {
  const exists = !!process.env[varName];
  console.log(`  ${exists ? '✅' : '⚠️'} ${varName}: ${exists ? 'Set' : 'Not set'}`);
});

// Test 4: Try to load smartTrader
console.log('\n📊 Testing SmartTrader loading...');
try {
  // Clear the require cache to ensure fresh load
  delete require.cache[require.resolve('./src/pumpTools/smartTrader.js')];
  
  // Check if the file exports what we expect
  const smartTraderPath = './src/pumpTools/smartTrader.js';
  const smartTraderContent = fs.readFileSync(smartTraderPath, 'utf8');
  
  // Look for key functions
  const hasRunMindEngine = smartTraderContent.includes('runMindEngine');
  const hasInitiateCoordinatedBuy = smartTraderContent.includes('initiateCoordinatedBuy');
  const hasConfig = smartTraderContent.includes('config');
  
  console.log(`  ${hasRunMindEngine ? '✅' : '❌'} Uses runMindEngine`);
  console.log(`  ${hasInitiateCoordinatedBuy ? '✅' : '❌'} Uses initiateCoordinatedBuy`);
  console.log(`  ${hasConfig ? '✅' : '❌'} Has configuration`);
  
  // Check import paths
  console.log('\n📍 Checking import paths in smartTrader.js...');
  const importMatch = smartTraderContent.match(/require\(['"]([^'"]*mindEngine[^'"]*)['"]\)/);
  if (importMatch) {
    console.log(`  Found mindEngine import: ${importMatch[1]}`);
    
    // Calculate correct path
    const smartTraderDir = path.dirname(smartTraderPath);
    const mindEnginePath = path.resolve(smartTraderDir, importMatch[1]);
    const correctPath = path.relative(smartTraderDir, './src/mindEngine.js');
    
    if (!fs.existsSync(mindEnginePath + '.js')) {
      console.log(`  ❌ Import path is incorrect`);
      console.log(`  💡 Should be: require('${correctPath}')`);
    } else {
      console.log(`  ✅ Import path is correct`);
    }
  }
  
} catch (err) {
  console.log(`  ❌ Error checking smartTrader: ${err.message}`);
}

console.log('\n✨ Integration test complete!\n');

// Provide next steps
console.log('📋 Next steps:');
console.log('1. If all checks passed, run: node src/pumpTools/smartTrader.js');
console.log('2. To run in LIVE mode, edit smartTrader.js and set testMode: false');
console.log('3. Monitor the logs directory for session analysis');
console.log('\n🦉 Happy trading!');