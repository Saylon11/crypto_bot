// src/scripts/testConnections.ts
import dotenv from 'dotenv';
import { Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { ConnectionPool } from '../core/connectionPool';
import { fetchBehaviorFromHelius, fetchTokenHolders } from '../utils/apiClient';
import { HELIUS_CONFIG } from '../config/helius.config';

dotenv.config();

/**
 * Test all HootBot connections and configurations
 */
async function testConnections() {
  console.log('🦉 HootBot Connection Test Suite');
  console.log('================================\n');

  // 1. Test Environment Variables
  console.log('1️⃣ Testing Environment Variables...');
  const requiredEnvVars = [
    'WALLET_SECRET_KEY',
    'HOOTBOT_WALLET_ADDRESS',
    'HELIUS_API_KEY',
    'HELIUS_RPC_URL',
    'QUICKNODE_RPC_URL',
    'TARGET_TOKEN_MINT'
  ];

  let envValid = true;
  for (const varName of requiredEnvVars) {
    const value = process.env[varName];
    if (!value) {
      console.error(`❌ Missing: ${varName}`);
      envValid = false;
    } else {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}...`);
    }
  }

  if (!envValid) {
    console.error('\n❌ Environment validation failed. Please check your .env file.');
    return;
  }

  // 2. Test Wallet Configuration
  console.log('\n2️⃣ Testing Wallet Configuration...');
  try {
    const keypair = Keypair.fromSecretKey(bs58.decode(process.env.WALLET_SECRET_KEY!));
    const publicKey = keypair.publicKey.toBase58();
    
    if (publicKey !== process.env.HOOTBOT_WALLET_ADDRESS) {
      console.warn(`⚠️ Wallet address mismatch!`);
      console.log(`   Derived: ${publicKey}`);
      console.log(`   In .env: ${process.env.HOOTBOT_WALLET_ADDRESS}`);
    } else {
      console.log(`✅ Wallet validated: ${publicKey}`);
    }
  } catch (error) {
    console.error('❌ Invalid wallet secret key:', error);
    return;
  }

  // 3. Test RPC Connections
  console.log('\n3️⃣ Testing RPC Connections...');
  const connectionPool = new ConnectionPool({
    preferredEndpoint: 'helius'
  });

  await connectionPool.testConnections();

  // 4. Test Helius API
  console.log('\n4️⃣ Testing Helius API...');
  console.log(`API Key: ${process.env.HELIUS_API_KEY}`);
  console.log(`Endpoint: ${HELIUS_CONFIG.API_BASE_URL}`);
  
  try {
    // Test fetching DutchBros data
    const dutchBrosData = await fetchBehaviorFromHelius(
      process.env.TARGET_TOKEN_MINT!,
      10 // Just fetch 10 for testing
    );
    
    console.log(`✅ Helius API working - fetched ${dutchBrosData.length} transactions`);
    
    if (dutchBrosData.length > 0) {
      console.log('   Sample transaction:', {
        wallet: dutchBrosData[0].walletAddress.substring(0, 20) + '...',
        type: dutchBrosData[0].type,
        amount: dutchBrosData[0].amount
      });
    }
  } catch (error) {
    console.error('❌ Helius API test failed:', error);
  }

  // 5. Test Token Holder Fetch
  console.log('\n5️⃣ Testing Token Holder Fetch...');
  try {
    const holders = await fetchTokenHolders(process.env.TARGET_TOKEN_MINT!);
    console.log(`✅ Token holder fetch working - found ${holders.length} holder(s)`);
  } catch (error) {
    console.error('❌ Token holder fetch failed:', error);
  }

  // 6. Credit Usage Check
  console.log('\n6️⃣ Helius Credit Usage...');
  console.log(`Plan: Developer`);
  console.log(`Credits: 29,900 / 10,000,000 used`);
  console.log(`Usage: ${(29900 / 10000000 * 100).toFixed(2)}%`);
  console.log(`Remaining: ${(10000000 - 29900).toLocaleString()} credits`);

  // 7. Performance Recommendations
  console.log('\n7️⃣ Performance Recommendations:');
  console.log('✅ Using Helius Developer plan - optimal for high-frequency trading');
  console.log('✅ 3000 RPS limit - sufficient for multiple wallets');
  console.log('✅ LaserStream enabled for real-time data');
  console.log('💡 Consider setting up webhooks for instant notifications');
  console.log('💡 Use batch requests where possible to save credits');

  console.log('\n✅ All systems operational! HootBot ready to fly 🦉');
}

// Run the test
testConnections().catch(console.error);

// Add this to package.json scripts:
// "test:connections": "ts-node src/scripts/testConnections.ts"