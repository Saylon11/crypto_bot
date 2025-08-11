// HootBot/scripts/testHeliusPro.ts

import { getHeliusConnection, getDynamicPriorityFee } from '../src/utils/heliusConnection';
import { getEnhancedExecutor } from '../src/pumpTools/enhancedTradeExecutor';
import { PublicKey } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function testHeliusProFeatures() {
  console.log('🧪 Testing Helius Professional Features\n');
  console.log('═'.repeat(50));

  const connection = getHeliusConnection();
  const executor = getEnhancedExecutor();

  // Test 1: Connection Status
  console.log('\n1️⃣ Testing Enhanced Connection...');
  try {
    const slot = await connection.getSlot();
    const version = await connection.getVersion();
    console.log(`✅ Connected to Solana`);
    console.log(`   Slot: ${slot}`);
    console.log(`   Version: ${version['solana-core']}`);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return;
  }

  // Test 2: Dynamic Priority Fees
  console.log('\n2️⃣ Testing Dynamic Priority Fees...');
  try {
    const fee = await getDynamicPriorityFee();
    console.log(`✅ Priority Fee: ${fee} SOL`);
    
    // Test with specific accounts
    const tokenMint = process.env.TARGET_TOKEN_MINT || 'So11111111111111111111111111111111111111112';
    const feeWithAccounts = await getDynamicPriorityFee([new PublicKey(tokenMint)]);
    console.log(`✅ Priority Fee (with accounts): ${feeWithAccounts} SOL`);
  } catch (error) {
    console.error('❌ Priority fee failed:', error);
  }

  // Test 3: Batch Account Fetching
  console.log('\n3️⃣ Testing Batch Account Fetching...');
  try {
    const accounts = [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' // USDT
    ].map(a => new PublicKey(a));

    const start = Date.now();
    const accountInfos = await connection.getMultipleAccountsInfoEfficient(accounts);
    const duration = Date.now() - start;

    console.log(`✅ Fetched ${accountInfos.length} accounts in ${duration}ms`);
    accountInfos.forEach((info, i) => {
      console.log(`   ${accounts[i].toBase58().slice(0, 8)}... ${info ? 'exists' : 'not found'}`);
    });
  } catch (error) {
    console.error('❌ Batch fetch failed:', error);
  }

  // Test 4: WebSocket Subscription
  console.log('\n4️⃣ Testing WebSocket Subscription...');
  try {
    const testAccount = new PublicKey('So11111111111111111111111111111111111111112');
    let updateCount = 0;
    
    const subscriptionId = await connection.subscribeToAccount(
      testAccount,
      (accountInfo) => {
        updateCount++;
        console.log(`   📊 Account update #${updateCount}`);
      }
    );

    console.log(`✅ Subscribed to account (ID: ${subscriptionId})`);
    console.log('   Listening for 10 seconds...');
    
    // Wait 10 seconds then unsubscribe
    await new Promise(resolve => setTimeout(resolve, 10000));
    await connection.removeAccountChangeListener(subscriptionId);
    console.log(`   Unsubscribed. Received ${updateCount} updates`);
  } catch (error) {
    console.error('❌ WebSocket subscription failed:', error);
  }

  // Test 5: RPC Rate Limit Test
  console.log('\n5️⃣ Testing RPC Rate Limits...');
  try {
    const requests = 100; // Professional plan supports 500/sec
    const start = Date.now();
    
    const promises = Array(requests).fill(0).map(() => 
      connection.getSlot()
    );
    
    await Promise.all(promises);
    const duration = Date.now() - start;
    const rps = (requests / duration) * 1000;
    
    console.log(`✅ Completed ${requests} requests in ${duration}ms`);
    console.log(`   Rate: ${rps.toFixed(0)} requests/second`);
    console.log(`   Status: ${rps > 50 ? '🚀 Professional Speed!' : '🐌 Still limited'}`);
  } catch (error) {
    console.error('❌ Rate limit test failed:', error);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Helius Professional Features Test Complete!');
  console.log('\n💡 Next Steps:');
  console.log('   1. Run migration script: npm run migrate:helius');
  console.log('   2. Test enhanced raid: npm run raid:enhanced');
  console.log('   3. Monitor with: npm run monitor');
  
  // Cleanup
  await executor.cleanup();
}

// Run test
testHeliusProFeatures().catch(console.error);