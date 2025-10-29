// Quick launcher to bypass TypeScript and run HootBot
const { spawn } = require('child_process');
const fs = require('fs');

console.log('🦉 HootBot Quick Launcher');
console.log('========================\n');

// Check wallet pool
if (fs.existsSync('walletPool/wallet100.json')) {
  console.log('✅ 100-wallet pool detected');
} else {
  console.log('❌ Wallet pool missing!');
  process.exit(1);
}

// Check main wallet
const mainWallet = JSON.parse(fs.readFileSync('wallet.json'));
console.log('✅ Main wallet loaded');

// Launch options
console.log('\n🚀 Launch Options:');
console.log('1. MIND Engine Only (Analysis)');
console.log('2. Smart Trader (TEST MODE)');
console.log('3. Smart Trader (LIVE MODE)');
console.log('4. Simple Buy Test\n');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Select option (1-4): ', (answer) => {
  switch(answer) {
    case '1':
      console.log('\n🧠 Starting MIND Engine...');
      spawn('node', ['dist/mindEngine.js'], { stdio: 'inherit' });
      break;
    
    case '2':
      console.log('\n🧪 Starting Smart Trader (TEST MODE)...');
      process.env.TEST_MODE = 'true';
      spawn('node', ['dist/pumpTools/smartTrader.js'], { stdio: 'inherit' });
      break;
    
    case '3':
      console.log('\n💰 Starting Smart Trader (LIVE MODE)...');
      console.log('⚠️  This will execute REAL trades!');
      process.env.TEST_MODE = 'false';
      spawn('node', ['dist/pumpTools/smartTrader.js'], { stdio: 'inherit' });
      break;
    
    case '4':
      console.log('\n🎯 Running simple buy test...');
      const testScript = `
        const { Keypair } = require('@solana/web3.js');
        const fs = require('fs');
        
        const wallet = Keypair.fromSecretKey(
          new Uint8Array(JSON.parse(fs.readFileSync('wallet.json')))
        );
        
        console.log('Wallet:', wallet.publicKey.toBase58());
        console.log('Expected: 3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D');
        console.log('Ready to trade!');
      `;
      
      fs.writeFileSync('test-buy.js', testScript);
      spawn('node', ['test-buy.js'], { stdio: 'inherit' });
      break;
    
    default:
      console.log('Invalid option');
  }
  
  readline.close();
});
