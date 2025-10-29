// testImplementation.js - Test HootBot Updates
// Location: Desktop/HootBot/testImplementation.js (ROOT LEVEL)

const dotenv = require('dotenv');
dotenv.config();

console.log('🧪 Testing HootBot Implementation...\n');

// Test 1: Check environment variables
console.log('1️⃣ Checking Environment Variables:');
const requiredEnvVars = [
  'WALLET_SECRET_KEY',
  'HOOTBOT_WALLET_ADDRESS', 
  'TARGET_TOKEN_MINT',
  'HELIUS_RPC_URL'
];

let envOk = true;
requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`   ✅ ${varName}: Set`);
  } else {
    console.log(`   ❌ ${varName}: MISSING!`);
    envOk = false;
  }
});

if (!envOk) {
  console.log('\n❌ Please set all required environment variables in .env file');
  process.exit(1);
}

// Test 2: Check if modules load correctly
console.log('\n2️⃣ Testing Module Imports:');
try {
  const { extractMindAction } = require('./smartTrader.js');
  console.log('   ✅ smartTrader.js loads correctly');
  
  // Test MIND action extraction
  const testMindResult = {
    tradeSuggestion: {
      action: 'BUY',
      percentage: 50,
      reason: 'Test reason'
    },
    survivabilityScore: 75,
    panicScore: 25
  };
  
  const extracted = extractMindAction(testMindResult);
  if (extracted.action === 'BUY' && extracted.survivability === 75) {
    console.log('   ✅ extractMindAction works correctly');
  } else {
    console.log('   ❌ extractMindAction not working properly');
  }
} catch (error) {
  console.log('   ❌ Error loading smartTrader.js:', error.message);
}

// Test 3: Check sellExecutor
console.log('\n3️⃣ Testing Sell Executor:');
try {
  const sellExecutor = require('./dist/pumpTools/sellExecutor.js');
  
  if (sellExecutor.executeTokenToSolSwap) {
    console.log('   ✅ sellExecutor has executeTokenToSolSwap function');
  } else {
    console.log('   ❌ sellExecutor missing executeTokenToSolSwap function');
  }
  
  if (sellExecutor.getSwapQuote) {
    console.log('   ✅ sellExecutor has Jupiter integration');
  } else {
    console.log('   ❌ sellExecutor missing Jupiter integration');
  }
} catch (error) {
  console.log('   ❌ Error loading sellExecutor:', error.message);
}

// Test 4: Check dependencies
console.log('\n4️⃣ Testing Dependencies:');
try {
  require('axios');
  console.log('   ✅ axios installed');
} catch {
  console.log('   ❌ axios not installed - run: npm install');
}

try {
  require('@solana/web3.js');
  console.log('   ✅ @solana/web3.js installed');
} catch {
  console.log('   ❌ @solana/web3.js not installed - run: npm install');
}

// Test 5: Test wallet connection
console.log('\n5️⃣ Testing Wallet Connection:');
const { Connection, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function testConnection() {
  try {
    const connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    const walletPubkey = new PublicKey(process.env.HOOTBOT_WALLET_ADDRESS);
    const balance = await connection.getBalance(walletPubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`   ✅ Wallet connected: ${solBalance.toFixed(4)} SOL`);
    
    if (solBalance < 0.1) {
      console.log('   ⚠️  Low balance - consider adding more SOL');
    }
  } catch (error) {
    console.log('   ❌ Connection error:', error.message);
  }
}

// Test 6: Simulate MIND detection of static values
console.log('\n6️⃣ Testing MIND Static Value Detection:');
const { extractMindAction } = require('./smartTrader.js');

const staticMindResult = {
  survivabilityScore: 90,
  action: 'BUY',
  percentage: 50,
  reason: 'Adequate liquidity, brand new token, micro cap gem'
};

const staticExtracted = extractMindAction(staticMindResult);
if (staticExtracted.action === 'WAIT' && staticExtracted.reason.includes('static values detected')) {
  console.log('   ✅ Static MIND values correctly detected and rejected');
} else {
  console.log('   ⚠️  Static MIND values not being caught properly');
}

// Run async tests
testConnection().then(() => {
  console.log('\n✅ Implementation test complete!');
  console.log('\n🚀 Ready to run: node smartTrader.js');
}).catch(error => {
  console.error('\n❌ Test failed:', error);
});