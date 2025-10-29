// test.ts - Place in HootBot root directory
import { initiateCoordinatedBuy, executePanicBuy } from './src/pumpTools/tradeExecutor';

async function test() {
  try {
    console.log('🦉 HootBot Test Trade Starting...\n');
    
    // Execute a 0.01 SOL buy
    await initiateCoordinatedBuy(0.01, true);
    
    console.log('\n✅ Trade complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

test();