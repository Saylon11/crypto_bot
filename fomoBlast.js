const { initiateCoordinatedBuy } = require('./dist/pumpTools/tradeExecutor');

async function blast() {
  console.log('🚀 DUTCHBROS FOMO BLAST!');
  
  // Big opening
  await initiateCoordinatedBuy(2.0);
  console.log('💥 Whale entered!');
  
  // FOMO train
  for(let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 5000 + Math.random() * 10000));
    const size = 0.1 + Math.random() * 0.4;
    await initiateCoordinatedBuy(size);
    console.log(`☕ Buy ${i+1}: ${size.toFixed(3)} SOL`);
  }
}

blast();
