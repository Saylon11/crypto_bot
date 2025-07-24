#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

// Import required modules
const { initiateCoordinatedBuy, executePanicBuy } = require('./dist/pumpTools/tradeExecutor');

// Import your actual MIND engine
async function runMindAnalysis() {
  try {
    // Use the compiled MIND engine directly
    const { runMindEngine } = require('./dist/mindEngine');
    return await runMindEngine();
  } catch (error) {
    console.error('MIND analysis error:', error.message);
    // Return safe defaults on error
    return {
      survivabilityScore: 0,
      tradeSuggestion: { action: 'WAIT', percentage: 0 }
    };
  }
}

async function executeTradeStrategy(mindOutput) {
  const { survivabilityScore, tradeSuggestion } = mindOutput;
  const { action, percentage } = tradeSuggestion;
  
  console.log(`\n📊 MIND Analysis Complete:`);
  console.log(`   Survivability: ${survivabilityScore}%`);
  console.log(`   Action: ${action}`);
  console.log(`   Suggested Size: ${percentage}%`);
  
  // Only trade if MIND says BUY
  if (action !== 'BUY') {
    console.log('❌ MIND says no trading. Waiting...');
    return 600000; // 10 min cooldown
  }
  
  // Scale trade size based on survivability and suggestion
  if (survivabilityScore >= 90 && percentage >= 50) {
    console.log('🔥 EXTREME CONFIDENCE - Maximum firepower!');
    await executePanicBuy(10);
    await sleep(5000);
    await initiateCoordinatedBuy(0.1);
    return 120000; // 2 min cooldown
    
  } else if (survivabilityScore >= 80 && percentage >= 25) {
    console.log('✅ HIGH CONFIDENCE - Strong trades');
    await initiateCoordinatedBuy(0.05);
    await sleep(3000);
    await executePanicBuy(5);
    return 180000; // 3 min cooldown
    
  } else if (survivabilityScore >= 70) {
    console.log('📊 GOOD CONFIDENCE - Standard trades');
    await initiateCoordinatedBuy(0.01);
    return 300000; // 5 min cooldown
    
  } else if (survivabilityScore >= 60) {
    console.log('⚠️ MODERATE CONFIDENCE - Conservative trades');
    await initiateCoordinatedBuy(0.001);
    return 600000; // 10 min cooldown
    
  } else {
    console.log('🛑 LOW CONFIDENCE - Minimal activity');
    await initiateCoordinatedBuy(0.0001);
    return 900000; // 15 min cooldown
  }
}

async function mindGuidedTrading() {
  console.log('🦉 HootBot MIND-Guided Trader v1.0');
  console.log('==================================');
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Trading: ${process.env.TEST_TOKEN_ADDRESS}\n`);
  
  // Track statistics
  let totalTrades = 0;
  let totalSpent = 0;
  
  while (true) {
    try {
      const cycleStart = Date.now();
      console.log(`\n⏰ [${new Date().toISOString()}] Starting analysis cycle...`);
      
      // Run MIND analysis
      console.log('🧠 Running MIND analysis...');
      const mindOutput = await runMindAnalysis();
      
      // Execute trades based on MIND
      const cooldown = await executeTradeStrategy(mindOutput);
      
      // Update stats
      totalTrades++;
      console.log(`\n📈 Session Stats:`);
      console.log(`   Total Cycles: ${totalTrades}`);
      console.log(`   Uptime: ${((Date.now() - cycleStart) / 3600000).toFixed(1)} hours`);
      
      // Wait before next cycle
      console.log(`⏰ Next cycle in ${cooldown/60000} minutes...`);
      console.log('─'.repeat(50));
      await sleep(cooldown);
      
    } catch (error) {
      console.error('\n❌ Trading cycle error:', error.message);
      console.log('🔄 Retrying in 5 minutes...');
      await sleep(300000); // 5 min on error
    }
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Graceful shutdown handlers
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

function shutdown() {
  console.log('\n\n👋 HootBot shutting down gracefully...');
  console.log('Final stats saved to logs/');
  process.exit(0);
}

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Start the automated trader
console.log('🚀 Initializing HootBot MIND Trader...\n');
mindGuidedTrading().catch(console.error);