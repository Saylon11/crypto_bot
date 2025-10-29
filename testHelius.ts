import dotenv from 'dotenv';
import { Connection } from '@solana/web3.js';

dotenv.config();

async function testHelius() {
  console.log('🦉 Testing HootBot Helius Connection...\n');
  
  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    console.error('❌ HELIUS_API_KEY not found in .env');
    return;
  }
  
  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...');
  
  const HELIUS_RPC = `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
  console.log('\n📡 Testing RPC connection...');
  
  try {
    const connection = new Connection(HELIUS_RPC, 'confirmed');
    const slot = await connection.getSlot();
    console.log('✅ RPC Connected! Current slot:', slot);
  } catch (error) {
    console.error('❌ RPC connection failed:', error);
  }
}

testHelius().catch(console.error);
