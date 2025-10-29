// HootBot/checkWalletProfiler.js
// Check what walletProfiler is returning

const { profileWallets } = require('./src/modules/walletProfiler');

console.log('🧪 Testing walletProfiler...\n');

try {
  // Call with mock data
  const result = profileWallets([]);
  
  console.log('Result type:', typeof result);
  console.log('Is array?', Array.isArray(result));
  console.log('Result:', JSON.stringify(result, null, 2));
  
  // Check if it has the expected structure
  if (result && typeof result === 'object') {
    console.log('\nProperties:');
    console.log('- whales:', Array.isArray(result.whales));
    console.log('- dolphins:', Array.isArray(result.dolphins));
    console.log('- shrimps:', Array.isArray(result.shrimps));
  }
  
} catch (error) {
  console.error('❌ Error:', error.message);
}