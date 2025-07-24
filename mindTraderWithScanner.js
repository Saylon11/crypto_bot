// mindTraderWithScanner.js - Your mindTrader enhanced with scanning
const { runMindEngine } = require('./dist/mindEngine');
const { initiateCoordinatedBuy, executePanicBuy } = require('./dist/pumpTools/tradeExecutor');
const { scanPumpTokens } = require('./dist/pumpTools/tokenScanner');
const dotenv = require('dotenv');

dotenv.config();

// Configuration
const config = {
  enableScanning: true,           // Enable token scanning
  scanInterval: 10,               // Scan every N cycles
  minScannerScore: 80,           // Minimum score to consider
  tradeDutchBros: true,          // Keep trading DutchBros
  tradeNewTokens: false,         // Auto-trade new tokens
  baseAmount: 0.01,              // Base trade amount
  panicMultiplier: 5,            // Panic buy multiplier
  cycleInterval: 3 * 60 * 1000   // 3 minutes
};

let cycleCount = 0;
const originalToken = process.env.DUTCHBROS_TOKEN_MINT;

async function analyzeCycle() {
  cycleCount++;
  console.log(`⏰ [${new Date().toISOString()}] Starting analysis cycle ${cycleCount}...`);
  
  // Scan for new tokens periodically
  if (config.enableScanning && cycleCount % config.scanInterval === 0) {
    console.log('\n🔍 Scanning for new opportunities...');
    
    try {
      const tokens = await scanPumpTokens();
      
      if (tokens.length > 0) {
        console.log(`Found ${tokens.length} potential tokens:\n`);
        
        tokens.slice(0, 3).forEach((token, i) => {
          console.log(`${i + 1}. ${token.symbol} - Score: ${token.score}/100`);
          console.log(`   Volume: $${token.volume?.toLocaleString() || 'N/A'}`);
        });
        
        // Check for high-score tokens
        const hotToken = tokens.find(t => t.score >= config.minScannerScore);
        
        if (hotToken) {
          console.log(`\n🔥 HOT TOKEN ALERT: ${hotToken.symbol} (Score: ${hotToken.score})`);
          
          if (config.tradeNewTokens) {
            // Analyze with MIND
            process.env.DUTCHBROS_TOKEN_MINT = hotToken.mint;
            const mindResult = await runMindEngine();
            
            if (mindResult.action === 'BUY' && mindResult.survivability > 70) {
              console.log(`✅ ${hotToken.symbol} approved by MIND!`);
              await initiateCoordinatedBuy(config.baseAmount);
            }
            
            // Restore original token
            process.env.DUTCHBROS_TOKEN_MINT = originalToken;
          }
        }
      }
    } catch (error) {
      console.error('Scanner error:', error.message);
    }
    
    console.log('\n' + '-'.repeat(50) + '\n');
  }
  
  // Continue with regular DutchBros trading
  if (config.tradeDutchBros) {
    console.log('🧠 Running MIND analysis for DutchBros...');
    const result = await runMindEngine();
    
    console.log(`\n📊 MIND Analysis Complete:`);
    console.log(`   Survivability: ${result.survivability}%`);
    console.log(`   Action: ${result.action}`);
    console.log(`   Suggested Size: ${result.suggestedSize}%`);
    
    if (result.action === 'BUY') {
      console.log('✅ HIGH CONFIDENCE - Strong trades\n');
      
      // Regular buy
      console.log(`🎯 Coordinated buy: ${config.baseAmount} SOL`);
      await initiateCoordinatedBuy(config.baseAmount);
      
      // Panic buy based on conditions
      if (result.survivability > 85 || result.devExhaustion > 90) {
        console.log(`\n🚨 PANIC BUY INITIATED - ${config.panicMultiplier}x multiplier`);
        await executePanicBuy(config.panicMultiplier);
      }
    } else if (result.action === 'HOLD') {
      console.log('⏸️ HOLD - Waiting for better entry');
    } else {
      console.log('🛑 EXIT SIGNAL - Consider reducing position');
    }
  }
}

async function main() {
  console.log('🚀 Initializing HootBot MIND Trader with Scanner...\n');
  console.log('🦉 HootBot MIND-Guided Trader v1.1 (with Scanner)');
  console.log('==================================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Primary Token: ${originalToken}`);
  console.log(`Scanner: ${config.enableScanning ? 'ENABLED' : 'DISABLED'}`);
  console.log(`Auto-trade new tokens: ${config.tradeNewTokens ? 'YES' : 'NO'}\n`);
  
  // Main loop
  while (true) {
    try {
      await analyzeCycle();
      
      console.log(`\n📈 Session Stats:`);
      console.log(`   Total Cycles: ${cycleCount}`);
      console.log(`   Uptime: ${(cycleCount * config.cycleInterval / 3600000).toFixed(1)} hours`);
      console.log(`⏰ Next cycle in ${config.cycleInterval / 60000} minutes...`);
      console.log('─'.repeat(50) + '\n');
      
      await new Promise(r => setTimeout(r, config.cycleInterval));
      
    } catch (error) {
      console.error('❌ Cycle error:', error);
      await new Promise(r => setTimeout(r, 30000)); // Wait 30s on error
    }
  }
}

// Run
if (require.main === module) {
  main().catch(console.error);
}