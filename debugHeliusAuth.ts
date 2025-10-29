import { Connection } from '@solana/web3.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function debugHeliusAuth() {
  const apiKey = process.env.HELIUS_API_KEY;
  console.log('🔍 Debugging Helius Authentication...\n');
  console.log(`📋 API Key: ${apiKey?.substring(0, 10)}...`);
  
  // Get current IP
  try {
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const { ip } = await ipResponse.json() as { ip: string };
    console.log(`🌐 Your IP: ${ip}`);
  } catch (e) {
    console.log('Could not fetch IP');
  }
  
  // Test 1: Direct API call
  console.log('\n1️⃣ Testing Helius API directly...');
  try {
    const response = await fetch('https://api.helius.xyz/v0/health', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    console.log(`API Health Check: ${response.status} ${response.statusText}`);
  } catch (e: any) {
    console.log('API test failed:', e.message);
  }
  
  // Test 2: RPC with different formats
  console.log('\n2️⃣ Testing RPC endpoints...');
  
  const endpoints = [
    {
      name: 'Standard RPC',
      url: `https://mainnet.helius-rpc.com/?api-key=${apiKey}`
    },
    {
      name: 'RPC without key (should fail)',
      url: 'https://mainnet.helius-rpc.com/'
    },
    {
      name: 'Public Solana RPC',
      url: 'https://api.mainnet-beta.solana.com'
    }
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\n🔗 Testing ${endpoint.name}...`);
    try {
      const connection = new Connection(endpoint.url);
      const slot = await connection.getSlot();
      console.log(`✅ Success! Slot: ${slot}`);
    } catch (error: any) {
      console.log(`❌ Failed: ${error.message.substring(0, 100)}...`);
    }
  }
  
  // Test 3: Check account status
  console.log('\n3️⃣ Checking account status...');
  try {
    const response = await fetch(`https://api.helius.xyz/v0/account?api-key=${apiKey}`);
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ Account is active');
      console.log(`Plan: ${data.plan || 'Unknown'}`);
      console.log(`Credits: ${data.credits || 'Unknown'}`);
    } else {
      console.log(`❌ Account check failed: ${response.status}`);
    }
  } catch (e: any) {
    console.log('Could not check account:', e.message);
  }
}

debugHeliusAuth().catch(console.error);
