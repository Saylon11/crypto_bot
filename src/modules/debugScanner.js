// debugScanner.js - Debug what's happening with the scanner
const axios = require('axios');

async function debugScan() {
  console.log('🔍 Scanner Debug Test\n');
  
  // Test 1: Basic API connectivity
  console.log('1️⃣ Testing DexScreener API...');
  try {
    const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/solana', {
      timeout: 10000
    });
    
    console.log('✅ API Connected');
    console.log(`   Status: ${response.status}`);
    console.log(`   Data exists: ${!!response.data}`);
    console.log(`   Has pairs: ${!!(response.data && response.data.pairs)}`);
    
    if (response.data && response.data.pairs) {
      console.log(`   Total pairs: ${response.data.pairs.length}`);
      
      // Count tokens by market cap ranges
      let under50k = 0, under100k = 0, under500k = 0, over500k = 0;
      
      for (const pair of response.data.pairs) {
        const mc = pair.fdv || pair.marketCap || 0;
        if (mc < 50000) under50k++;
        else if (mc < 100000) under100k++;
        else if (mc < 500000) under500k++;
        else over500k++;
      }
      
      console.log('\n📊 Market Cap Distribution:');
      console.log(`   Under $50K: ${under50k}`);
      console.log(`   $50K-$100K: ${under100k - under50k}`);
      console.log(`   $100K-$500K: ${under500k - under100k}`);
      console.log(`   Over $500K: ${over500k}`);
      
      // Show some examples
      console.log('\n📋 Example tokens under $500K:');
      let count = 0;
      for (const pair of response.data.pairs) {
        const mc = pair.fdv || pair.marketCap || 0;
        const vol = parseFloat(pair.volume?.h24 || 0);
        
        if (mc < 500000 && mc > 0 && vol > 1000) {
          console.log(`   ${pair.baseToken?.symbol}: MC=$${mc.toLocaleString()}, Vol=$${vol.toLocaleString()}`);
          count++;
          if (count >= 5) break;
        }
      }
    }
    
  } catch (error) {
    console.log('❌ DexScreener Error:', error.message);
  }
  
  // Test 2: Alternative endpoints
  console.log('\n2️⃣ Testing alternative endpoints...');
  
  const endpoints = [
    'https://api.dexscreener.com/latest/dex/pairs/solana',
    'https://api.dexscreener.com/latest/dex/search?q=solana'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, { timeout: 5000 });
      console.log(`✅ ${endpoint}: ${response.status}`);
    } catch (e) {
      console.log(`❌ ${endpoint}: ${e.message}`);
    }
  }
  
  // Test 3: Direct token lookup
  console.log('\n3️⃣ Testing specific token lookup...');
  try {
    // Test with a known small token
    const testResponse = await axios.get('https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112');
    console.log('✅ Can fetch individual tokens');
  } catch (e) {
    console.log('❌ Individual token fetch failed');
  }
  
  // Test 4: Show raw response structure
  console.log('\n4️⃣ Raw response structure:');
  try {
    const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/solana', {
      timeout: 5000
    });
    
    if (response.data && response.data.pairs && response.data.pairs[0]) {
      console.log('First pair structure:');
      const pair = response.data.pairs[0];
      console.log(JSON.stringify({
        baseToken: pair.baseToken?.symbol,
        marketCap: pair.marketCap,
        fdv: pair.fdv,
        volume: pair.volume,
        liquidity: pair.liquidity,
        priceChange: pair.priceChange
      }, null, 2));
    }
  } catch (e) {
    console.log('Could not show structure');
  }
}

debugScan().catch(console.error);