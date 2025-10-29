// HootBot/src/test-mind-minimal.ts
import { MindCore } from './mind/mindCore';
import { getUnifiedScanner } from './scanners/unifiedScanner';
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function testMinimal() {
  console.log('🧪 Minimal MIND Test\n');
  
  try {
    // Test 1: Create instances
    console.log('1️⃣ Creating MIND Core...');
    const mind = new MindCore();
    console.log('✅ MIND Core created\n');
    
    // Test 2: Create scanner
    console.log('2️⃣ Creating Unified Scanner...');
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    const scanner = getUnifiedScanner(connection);
    console.log('✅ Scanner created\n');
    
    // Test 3: Generate a WAIT directive
    console.log('3️⃣ Testing MIND directive generation...');
    const directive = await mind.scanForOpportunities();
    console.log('✅ Directive generated:');
    console.log(`   Action: ${directive.action}`);
    console.log(`   Reason: ${directive.reason}`);
    
    console.log('\n✅ All basic tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMinimal().catch(console.error);