// HootBot/src/utils/diagnoseRaydium.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseRaydiumConnection() {
  console.log('🏥 Running Raydium/Jupiter Diagnostic...\n');

  // 1. Test RPC Connection
  console.log('1️⃣ Testing RPC Connection...');
  const heliusKey = process.env.HELIUS_API_KEY;
  const rpcUrl = heliusKey 
    ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
    : 'https://api.mainnet-beta.solana.com';
  
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const slot = await connection.getSlot();
    console.log(`✅ RPC Connected - Current slot: ${slot}`);
    console.log(`   Using: ${heliusKey ? 'Helius' : 'Public'} RPC\n`);
  } catch (error: any) {
    console.error('❌ RPC Connection failed:', error.message);
    return;
  }

  // 2. Test Token Configuration
  console.log('2️⃣ Testing Token Configuration...');
  const tokenMint = process.env.FATBEAR_TOKEN_MINT || process.env.PRIMARY_TOKEN_MINT;
  if (!tokenMint) {
    console.error('❌ FATBEAR_TOKEN_MINT not found in .env');
    return;
  }
  console.log(`✅ Token mint: ${tokenMint}\n`);

  // 3. Test Jupiter API
  console.log('3️⃣ Testing Jupiter API...');
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  
  try {
    // Test getting a quote
    const quoteUrl = `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${SOL_MINT}&` +
      `outputMint=${tokenMint}&` +
      `amount=${0.001 * LAMPORTS_PER_SOL}&` +
      `slippageBps=50`;
    
    console.log(`   Fetching quote for 0.001 SOL -> ${tokenMint.slice(0, 8)}...`);
    const response = await fetch(quoteUrl);
    
    if (response.ok) {
      const quote = await response.json();
      console.log(`✅ Jupiter API working!`);
      console.log(`   Routes found: ${quote.routePlan?.length || 0}`);
      console.log(`   Price impact: ${quote.priceImpactPct}%`);
      
      if (!quote.routePlan || quote.routePlan.length === 0) {
        console.error(`\n⚠️  WARNING: Token may not have sufficient liquidity on Raydium`);
      }
    } else {
      const error = await response.text();
      console.error(`❌ Jupiter API error: ${error}`);
    }
  } catch (error: any) {
    console.error('❌ Jupiter API request failed:', error.message);
  }

  console.log('\n✅ Diagnostic complete!');
}

// Run diagnostic
diagnoseRaydiumConnection().catch(console.error);
