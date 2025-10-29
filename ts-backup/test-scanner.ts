// HootBot/src/test-scanner.ts
import { config } from 'dotenv';
import { scanForOpportunities } from './scanners/unifiedScanner';
import { MindCore } from './mind/mindCore';

config();

async function testScanner() {
  console.log('🧪 Testing M.I.N.D. Scanner Integration\n');
  
  try {
    // Test unified scanner
    console.log('1️⃣ Testing Unified Scanner...');
    const opportunities = await scanForOpportunities();
    
    console.log(`\n✅ Found ${opportunities.length} tokens`);
    
    if (opportunities.length > 0) {
      console.log('\nTop 5 opportunities:');
      opportunities.slice(0, 5).forEach((token, i) => {
        console.log(`\n${i + 1}. ${token.symbol || 'Unknown'} (${token.source})`);
        console.log(`   Mint: ${token.mint.slice(0, 8)}...`);
        console.log(`   Market Cap: $${(token.marketCap / 1000).toFixed(1)}k`);
        console.log(`   Volume: $${(token.volume24h / 1000).toFixed(1)}k`);
        console.log(`   Score: ${token.emotionalScore || token.scannerScore || 'N/A'}/100`);
        console.log(`   Status: ${token.isGraduated ? 'Graduated' : 'Pump.fun'}`);
      });
    }
    
    // Test MIND analysis
    console.log('\n\n2️⃣ Testing M.I.N.D. Analysis...');
    const mind = new MindCore();
    const directive = await mind.scanForOpportunities();
    
    console.log('\n📋 M.I.N.D. Directive:');
    console.log(`   Action: ${directive.action}`);
    console.log(`   Token: ${directive.tokenSymbol || directive.tokenAddress.slice(0, 8) || 'None'}`);
    console.log(`   Confidence: ${directive.confidence}%`);
    console.log(`   Reason: ${directive.reason}`);
    
    if (directive.metadata) {
      console.log('\n📊 Analysis Metadata:');
      console.log(`   Survivability: ${directive.metadata.survivabilityScore}%`);
      console.log(`   Market Cap: $${((directive.metadata.marketCap || 0) / 1000).toFixed(1)}k`);
      console.log(`   Graduated: ${directive.metadata.isGraduated ? 'Yes' : 'No'}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testScanner().catch(console.error);