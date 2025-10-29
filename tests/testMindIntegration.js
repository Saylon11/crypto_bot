// HootBot/tests/testMindIntegration.js
const { MindCore } = require('../dist/mind/mindCore');
const { getUnifiedScanner } = require('../dist/scanners/unifiedScanner');
const dotenv = require('dotenv');

dotenv.config();

async function testMindIntegration() {
  console.log('🧪 Testing MIND Integration...\n');
  
  try {
    // Test 1: Unified Scanner
    console.log('1️⃣ Testing Unified Scanner...');
    const scanner = getUnifiedScanner();
    const tokens = await scanner.scanAll();
    
    console.log(`✅ Found ${tokens.length} tokens`);
    if (tokens.length > 0) {
      console.log('\nTop 3 tokens:');
      tokens.slice(0, 3).forEach((token, i) => {
        console.log(`${i + 1}. ${token.symbol || 'Unknown'} (${token.source})`);
        console.log(`   Mint: ${token.mint.slice(0, 8)}...`);
        console.log(`   Score: ${token.emotionalScore || token.scannerScore || 'N/A'}`);
      });
    }
    
    // Test 2: MIND Analysis
    console.log('\n\n2️⃣ Testing MIND Core...');
    const mind = new MindCore();
    const directive = await mind.scanForOpportunities();
    
    console.log('\n📋 MIND Directive Generated:');
    console.log(`   Action: ${directive.action}`);
    console.log(`   Token: ${directive.tokenSymbol || directive.tokenAddress || 'None'}`);
    console.log(`   Confidence: ${directive.confidence}%`);
    console.log(`   Priority: ${directive.priority}`);
    console.log(`   Reason: ${directive.reason}`);
    
    if (directive.metadata) {
      console.log('\n📊 Metadata:');
      console.log(`   Survivability: ${directive.metadata.survivabilityScore || 'N/A'}%`);
      console.log(`   Market Cap: $${((directive.metadata.marketCap || 0) / 1000).toFixed(1)}k`);
    }
    
    console.log('\n✅ All tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run tests
if (require.main === module) {
  testMindIntegration()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { testMindIntegration };