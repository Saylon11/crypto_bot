import dotenv from 'dotenv';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

// Load environment variables
dotenv.config();

console.log("🔍 Debugging Environment Variables\n");

// Check if .env is loaded
console.log("Current working directory:", process.cwd());
console.log(".env file loaded from:", process.cwd() + '/.env');

// Check each wallet key
const walletKeys = [
  'RAID_WALLET_1',
  'RAID_WALLET_2', 
  'RAID_WALLET_3',
  'RAID_WALLET_4',
  'RAID_WALLET_5'
];

console.log("\n📋 Environment Variable Check:");
walletKeys.forEach(key => {
  const value = process.env[key];
  if (!value) {
    console.log(`❌ ${key}: NOT FOUND in environment`);
  } else {
    console.log(`✅ ${key}: Found (length: ${value.length} chars)`);
    
    // Try to validate it's a valid base58 key
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(value));
      console.log(`   Address: ${keypair.publicKey.toString()}`);
    } catch (error) {
      console.log(`   ⚠️  Invalid key format: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
});

// Also check Helius RPC
console.log("\n🌐 RPC Configuration:");
console.log(`HELIUS_RPC_URL: ${process.env.HELIUS_RPC_URL ? '✅ Found' : '❌ Not found'}`);

// Show all env vars that start with RAID_ (without showing the actual keys)
console.log("\n📦 All RAID_ variables in environment:");
Object.keys(process.env)
  .filter(key => key.startsWith('RAID_'))
  .forEach(key => {
    console.log(`- ${key}: ${process.env[key] ? 'Set' : 'Not set'}`);
  });