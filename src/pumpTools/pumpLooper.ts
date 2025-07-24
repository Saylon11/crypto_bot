// src/pumpBot/pumpLooper.ts

import dotenv from 'dotenv';
dotenv.config();

import { executeIntelligentTrade } from './tradeExecutor';
import { getNextTradeDelay } from './randomUtils';
import { mind } from './mindClient';

/**
 * State for raid session.
 */
let isRaidActive = true;
let activePhaseEndTime = Date.now() + getRandomDuration(30 * 60 * 1000, 60 * 60 * 1000); // 30–60 min active session
let consecutiveSkips = 0;
let totalTrades = 0;
let successfulTrades = 0;

/**
 * Main loop function for pump looper with MIND integration
 */
async function pumpLoop() {
  if (!isRaidActive) {
    console.log('💤 Dormant phase. Waiting to resume...');
    const dormantDelay = getRandomDuration(5 * 60 * 1000, 10 * 60 * 1000); // 5–10 min wait
    setTimeout(pumpLoop, dormantDelay);
    return;
  }

  if (Date.now() > activePhaseEndTime) {
    console.log('🕳 Entering dormant phase...');
    console.log(`📊 Session stats: ${successfulTrades}/${totalTrades} trades executed`);
    isRaidActive = false;
    const dormantDelay = getRandomDuration(45 * 60 * 1000, 90 * 60 * 1000); // 45–90 min rest
    setTimeout(() => {
      isRaidActive = true;
      activePhaseEndTime = Date.now() + getRandomDuration(30 * 60 * 1000, 60 * 60 * 1000);
      consecutiveSkips = 0;
      console.log('🔥 Reactivating loop...');
      pumpLoop();
    }, dormantDelay);
    return;
  }

  // Check if we should trade based on MIND analysis
  try {
    const shouldTradeCheck = await mind.shouldTrade();
    totalTrades++;
    
    if (shouldTradeCheck.shouldTrade) {
      console.log(`✅ MIND approves trade: ${shouldTradeCheck.reason}`);
      await executeIntelligentTrade();
      successfulTrades++;
      consecutiveSkips = 0;
    } else {
      consecutiveSkips++;
      console.log(`⏭️ Skipping trade (${consecutiveSkips} in a row): ${shouldTradeCheck.reason}`);
      
      // If we've skipped too many times, enter early dormancy
      if (consecutiveSkips > 5) {
        console.log('😴 Too many skips. Entering early dormancy...');
        activePhaseEndTime = Date.now(); // Trigger dormant phase
      }
    }
  } catch (err) {
    console.error('❌ Error in pump loop:', err);
  }

  // Schedule next trade attempt with dynamic delay
  const baseDelay = getNextTradeDelay();
  // Increase delay if we're skipping trades
  const adjustedDelay = consecutiveSkips > 0 ? baseDelay * (1 + consecutiveSkips * 0.5) : baseDelay;
  
  console.log(`⏱ Next check in ${(adjustedDelay / 1000).toFixed(2)}s`);
  setTimeout(pumpLoop, adjustedDelay);
}

/**
 * Returns a random integer between min and max (inclusive).
 */
function getRandomDuration(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Start the pump looper with initial MIND check
 */
async function startPumpLooper() {
  console.log('🚀 Launching PumpLooper with MIND integration...');
  
  // Initial market check
  const marketState = await mind.getMarketState(process.env.TEST_TOKEN_ADDRESS || '');
  console.log('\n📊 Initial Market Analysis:');
  console.log(`   Survivability: ${marketState.survivabilityScore}%`);
  console.log(`   Recommendation: ${marketState.recommendation}`);
  console.log(`   Reason: ${marketState.reason}\n`);
  
  // Start the loop
  pumpLoop();
}

// Start the loop
startPumpLooper();