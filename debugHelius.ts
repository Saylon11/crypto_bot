import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

async function debugHelius() {
  const apiKey = process.env.HELIUS_API_KEY;
  console.log('🔍 Debugging Helius Connection...');
  console.log(`📋 API Key: ${apiKey?.substring(0, 10)}...`);
  
  // Test different Helius endpoints
  const endpoints = [
    `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    `https://rpc.helius.xyz/?api-key=${apiKey}`,
    `https://mainnet.helius.xyz/?api-key=${apiKey}`,
    `https://api.helius.xyz/v0/rpc?api-key=${apiKey}`
  ];
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting: ${endpoint.split('?')[0]}`);
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const version = await connection.getVersion();
      console.log('✅ SUCCESS! Version:', version['solana-core']);
      console.log('Use this endpoint format!');
      
      // Test a simple RPC call
      const slot = await connection.getSlot();
      console.log('Current slot:', slot);
      return;
    } catch (error: any) {
      console.log('❌ Failed:', error.message);
    }
  }
  
  console.log('\n⚠️  All Helius endpoints failed. Checking if API key is valid...');
  
  // Test Helius API directly
  try {
    const response = await fetch(`https://api.helius.xyz/v0/addresses/test?api-key=${apiKey}`);
    console.log('API Response Status:', response.status);
    if (response.status === 401) {
      console.log('❌ API Key is invalid or expired!');
      console.log('Please check your Helius dashboard and update HELIUS_API_KEY in .env');
    }
  } catch (error) {
    console.log('Could not verify API key');
  }
}

debugHelius().catch(console.error);
