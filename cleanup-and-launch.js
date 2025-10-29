// cleanup-and-launch.js - Clean up redundant scanners and launch unified scanner

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🧹 HootBot Scanner Cleanup & Launch');
console.log('===================================\n');

// Files to remove (redundant scanners)
const filesToRemove = [
  // Test files we created today
  'test-scanner.js',
  'working-scanner.js',
  'multi-source-scanner.js',
  'new-token-hunter.js',
  'hyperScanner.js',
  'launch-hyperscanner.js',
  'launch-scanner.js',
  'fix-scanner.js',
  
  // Old scanner attempts
  'testScanner.js',
  'mindTraderWithScanner.js'
];

// Clean up redundant files
console.log('🗑️  Removing redundant scanner files...');
let removedCount = 0;

filesToRemove.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    console.log(`   ❌ Removed: ${file}`);
    removedCount++;
  }
});

console.log(`\n✅ Cleaned up ${removedCount} redundant files\n`);

// Create new launcher
console.log('📝 Creating unified launcher...\n');

const launcherContent = `#!/usr/bin/env node
// launch-unified-scanner.js - HootBot Real-Time Scanner Launcher

const { spawn } = require('child_process');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🦉 HootBot Unified Scanner Launcher');
console.log('===================================\\n');

console.log('Scanner Features:');
console.log('✅ PumpPortal WebSocket - Real-time pump.fun tokens');
console.log('✅ Raydium monitoring - Graduated tokens');
console.log('✅ Meteora monitoring - New pools');
console.log('✅ GeckoTerminal - Backup detection');
console.log('✅ Multi-wallet rotation (100 wallets)');
console.log('✅ MIND integration - Smart filtering\\n');

console.log('Launch Options:');
console.log('1. Production Mode (Real trades)');
console.log('2. Test Mode (Simulation only)');
console.log('3. Scanner + Smart Trader');
console.log('4. Check wallet balances\\n');

readline.question('Select option (1-4): ', (answer) => {
  switch(answer) {
    case '1':
      console.log('\\n🚀 Starting Production Scanner...');
      console.log('⚠️  REAL TRADES WILL BE EXECUTED!\\n');
      process.env.TEST_MODE = 'false';
      spawn('npx', ['ts-node', 'src/scanners/unifiedScanner.ts'], { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      break;
      
    case '2':
      console.log('\\n🧪 Starting Test Mode Scanner...');
      console.log('✅ No real trades will be executed\\n');
      process.env.TEST_MODE = 'true';
      spawn('npx', ['ts-node', 'src/scanners/unifiedScanner.ts'], { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      break;
      
    case '3':
      console.log('\\n🤖 Starting Scanner + Smart Trader...');
      
      // Start scanner in background
      const scanner = spawn('npx', ['ts-node', 'src/scanners/unifiedScanner.ts'], {
        env: { ...process.env }
      });
      
      // Start smart trader
      setTimeout(() => {
        console.log('\\n🧠 Starting Smart Trader...');
        spawn('node', ['dist/pumpTools/smartTrader.js'], { 
          stdio: 'inherit',
          env: { ...process.env }
        });
      }, 5000);
      
      // Handle scanner output
      scanner.stdout.on('data', (data) => {
        console.log(\`[Scanner] \${data}\`);
      });
      
      scanner.stderr.on('data', (data) => {
        console.error(\`[Scanner Error] \${data}\`);
      });
      
      break;
      
    case '4':
      console.log('\\n💰 Checking wallet balances...');
      spawn('node', ['check-wallets.js'], { stdio: 'inherit' });
      break;
      
    default:
      console.log('Invalid option');
  }
  
  readline.close();
});
`;

fs.writeFileSync('launch-unified-scanner.js', launcherContent);
console.log('✅ Created launch-unified-scanner.js');

// Create integration file for existing code
console.log('\n📝 Creating integration helper...\n');

const integrationContent = `// src/scanners/scannerIntegration.ts
// Integration helper to connect unified scanner with existing HootBot code

import { scanner } from './unifiedScanner';
import { initiateCoordinatedBuy } from '../pumpTools/tradeExecutor';
import { runMindEngine } from '../mindEngine';

// Replace old scanner calls with unified scanner
export async function scanAllTokens() {
  console.log('🔄 Redirecting to Unified Scanner...');
  
  // Start scanner if not running
  if (!scanner.getStats().isRunning) {
    await scanner.start();
  }
  
  // Return current stats instead of token list
  return scanner.getStats();
}

// Helper to check if scanner is running
export function isScannerActive(): boolean {
  return scanner.getStats().isRunning;
}

// Export scanner instance for direct access
export { scanner as unifiedScanner };

// Backward compatibility exports
export const scanDexScreener = scanAllTokens;
export const scanJupiterTokens = scanAllTokens;
export const scanPumpTokens = scanAllTokens;
`;

fs.writeFileSync('src/scanners/scannerIntegration.ts', integrationContent);
console.log('✅ Created scanner integration helper');

// Update instructions
console.log('\n' + '='.repeat(50));
console.log('✅ CLEANUP COMPLETE!');
console.log('='.repeat(50) + '\n');

console.log('📋 What we did:');
console.log('   1. Removed ' + removedCount + ' redundant scanner files');
console.log('   2. Created unified scanner (src/scanners/unifiedScanner.ts)');
console.log('   3. Created launcher (launch-unified-scanner.js)');
console.log('   4. Created integration helper\n');

console.log('🚀 To launch the new scanner:');
console.log('   node launch-unified-scanner.js\n');

console.log('🔧 To compile TypeScript:');
console.log('   npm run build\n');

console.log('📡 The unified scanner includes:');
console.log('   • PumpPortal WebSocket (real-time pump.fun)');
console.log('   • Raydium pool monitoring');
console.log('   • Meteora pool monitoring');
console.log('   • GeckoTerminal fallback');
console.log('   • Sub-second detection');
console.log('   • Auto-buy on score >90');
console.log('   • MIND analysis integration\n');

console.log('Ready to find gems! 💎');