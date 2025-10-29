// HootBot/src/utils/fixWallets.ts
import { convertWalletKeys, validateWalletConfiguration } from './walletLoader';
import dotenv from 'dotenv';

dotenv.config();

console.log('🦉 HootBot Wallet Configuration Tool\n');

// First, try to convert any wallet keys that need it
convertWalletKeys();

console.log('\n' + '═'.repeat(60) + '\n');

// Then validate the configuration
const isValid = validateWalletConfiguration();

if (isValid) {
  console.log('\n✅ Wallet configuration is valid and ready to use!');
} else {
  console.log('\n❌ Wallet configuration needs attention.');
}

// Also check if we're looking at the right wallet.json file
console.log('\n📁 Checking wallet.json file...');
const walletJsonPath = process.env.HOOTBOT_KEYPAIR_PATH;
if (walletJsonPath) {
  console.log(`   Path: ${walletJsonPath}`);
  try {
    const fs = require('fs');
    if (fs.existsSync(walletJsonPath)) {
      const data = JSON.parse(fs.readFileSync(walletJsonPath, 'utf-8'));
      console.log(`   ✅ File exists with ${data.length} bytes`);
    } else {
      console.log('   ❌ File not found at specified path');
    }
  } catch (error: any) {
    console.log(`   ❌ Error reading file: ${error.message}`);
  }
}
