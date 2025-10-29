// HootBot/diagnostic.js - Simple diagnostic script
// Place this in your HootBot root folder (not in src)

require('dotenv').config();

console.log('🦉 HootBot Quick Diagnostic');
console.log('==========================\n');

// Check environment variables
console.log('1️⃣ Environment Variables:');
console.log(`   HELIUS_API_KEY: ${process.env.HELIUS_API_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   WALLET_SECRET_KEY: ${process.env.WALLET_SECRET_KEY ? '✅ Set' : '❌ Missing (will be auto-generated)'}`);
console.log(`   HOOTBOT_KEYPAIR_PATH: ${process.env.HOOTBOT_KEYPAIR_PATH ? '✅ Set' : '❌ Missing'}`);
console.log(`   PRIMARY_TOKEN_MINT: ${process.env.PRIMARY_TOKEN_MINT ? '✅ Set' : '❌ Missing'}`);
console.log(`   TEST_TOKEN_ADDRESS: ${process.env.TEST_TOKEN_ADDRESS || process.env.PRIMARY_TOKEN_MINT ? '✅ Set' : '❌ Missing'}`);

// Set TEST_TOKEN_ADDRESS if not set but PRIMARY_TOKEN_MINT is
if (!process.env.TEST_TOKEN_ADDRESS && process.env.PRIMARY_TOKEN_MINT) {
  process.env.TEST_TOKEN_ADDRESS = process.env.PRIMARY_TOKEN_MINT;
}
// Check if wallet.json exists
const fs = require('fs');
const path = require('path');

console.log('\n2️⃣ Wallet File:');
const walletPath = path.join(__dirname, 'wallet.json');
if (fs.existsSync(walletPath)) {
  console.log(`   wallet.json: ✅ Found at ${walletPath}`);
} else {
  console.log(`   wallet.json: ❌ Not found at ${walletPath}`);
}

// Check node version
console.log('\n3️⃣ Node.js Version:');
console.log(`   Version: ${process.version}`);
console.log(`   ${process.version >= 'v16' ? '✅ Compatible' : '❌ Need Node 16+'}`);

// Check if key files exist
console.log('\n4️⃣ Key Files:');
const keyFiles = [
  'src/types/index.ts',
  'src/utils/walletManager.ts',
  'src/scanners/integratedMarketScanner.ts',
  'src/mindIntegration.ts',
  'package.json',
  '.env'
];

keyFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${file}: ${exists ? '✅' : '❌'}`);
});

console.log('\n5️⃣ Quick RPC Test:');
// Try a simple connection
const { Connection } = require('@solana/web3.js');
const connection = new Connection('https://api.mainnet-beta.solana.com');

connection.getSlot()
  .then(slot => {
    console.log(`   RPC Connection: ✅ (slot: ${slot})`);
    console.log('\n✅ Basic checks complete!');
    console.log('Run the full TypeScript diagnostic for detailed analysis.');
  })
  .catch(err => {
    console.log(`   RPC Connection: ❌ ${err.message}`);
  });