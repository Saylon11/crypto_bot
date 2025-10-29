// HootBot/tests/testMindSimple.js
require('dotenv').config();

console.log('🧪 Simple MIND Test\n');

// Test environment
console.log('Environment Check:');
console.log(`   Primary Token: ${process.env.PRIMARY_TOKEN_MINT ? '✅' : '❌'}`);
console.log(`   Wallet Path: ${process.env.HOOTBOT_KEYPAIR_PATH ? '✅' : '❌'}`);
console.log(`   RPC: ${process.env.HELIUS_API_KEY ? 'Helius ✅' : 'Public ⚠️'}`);

// Test imports
try {
  console.log('\nTesting imports...');
  
  // Test if files exist
  const fs = require('fs');
  const path = require('path');
  
  const filesToCheck = [
    'dist/mind/mindCore.js',
    'dist/mind/contract.js',
    'dist/scanners/unifiedScanner.js',
    'dist/scanners/gemScanner.js',
    'dist/executor/hootBotExecutor.js',
    'dist/executor/walletManager.js',
    'dist/orchestrator.js'
  ];
  
  filesToCheck.forEach(file => {
    const exists = fs.existsSync(path.join(__dirname, '..', file));
    console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
  });
  
  // Try to import the main components
  console.log('\nTesting component imports...');
  
  try {
    const { MindCore } = require('../dist/mind/mindCore');
    console.log('   MindCore: ✅');
  } catch (e) {
    console.log('   MindCore: ❌', e.message);
  }
  
  try {
    const { getUnifiedScanner } = require('../dist/scanners/unifiedScanner');
    console.log('   UnifiedScanner: ✅');
  } catch (e) {
    console.log('   UnifiedScanner: ❌', e.message);
  }
  
  try {
    const MindHootBotOrchestrator = require('../dist/orchestrator').default;
    console.log('   Orchestrator: ✅');
  } catch (e) {
    console.log('   Orchestrator: ❌', e.message);
  }
  
  console.log('\n✅ Basic tests complete!');
  
} catch (error) {
  console.error('❌ Test failed:', error);
}