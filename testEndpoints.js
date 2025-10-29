// HootBot/testEndpoints.js
// Test which API endpoints actually work

const axios = require('axios');

async function testEndpoint(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`   URL: ${url}`);
  
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        ...options.headers
      }
    });
    
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   ✅ Has data: ${!!response.data}`);
    
    // Check structure
    if (response.data) {
      if (Array.isArray(response.data)) {
        console.log(`   ✅ Array with ${response.data.length} items`);
        if (response.data.length > 0) {
          console.log(`   📋 Sample:`, JSON.stringify(response.data[0], null, 2).slice(0, 200) + '...');
        }
      } else if (response.data.pairs) {
        console.log(`   ✅ Has pairs: ${response.data.pairs.length}`);
        if (response.data.pairs.length > 0) {
          const pair = response.data.pairs[0];
          console.log(`   📋 First pair: ${pair.baseToken?.symbol || 'N/A'}`);
          console.log(`   📋 Chain: ${pair.chainId || 'N/A'}`);
          console.log(`   📋 Has mint: ${!!pair.baseToken?.address}`);
        }
      } else if (response.data.data) {
        console.log(`   ✅ Has data.data`);
        if (Array.isArray(response.data.data)) {
          console.log(`   ✅ ${response.data.data.length} items in data.data`);
        }
      } else {
        console.log(`   📋 Structure:`, Object.keys(response.data).slice(0, 10));
      }
    }
    
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   ❌ Status: ${error.response.status}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('🔍 Testing API Endpoints for HootBot Scanner\n');
  
  const endpoints = [
    // DexScreener endpoints
    {
      name: 'DexScreener Tokens (Solana)',
      url: 'https://api.dexscreener.com/latest/dex/tokens/solana'
    },
    {
      name: 'DexScreener Search',
      url: 'https://api.dexscreener.com/latest/dex/search?q=solana'
    },
    {
      name: 'DexScreener Token Profiles',
      url: 'https://api.dexscreener.com/token-profiles/latest/v1/latest?chains=solana'
    },
    
    // Jupiter
    {
      name: 'Jupiter Token List',
      url: 'https://token.jup.ag/all'
    },
    {
      name: 'Jupiter Strict List',
      url: 'https://token.jup.ag/strict'
    },
    {
      name: 'Jupiter Price API',
      url: 'https://price.jup.ag/v6/price?ids=So11111111111111111111111111111111111111112'
    },
    
    // Birdeye
    {
      name: 'Birdeye Token List',
      url: 'https://public-api.birdeye.so/public/tokenlist'
    },
    {
      name: 'Birdeye New Listings',
      url: 'https://public-api.birdeye.so/public/tokenlist?sort_by=v24hUSD&sort_type=desc'
    },
    
    // GeckoTerminal
    {
      name: 'GeckoTerminal Networks',
      url: 'https://api.geckoterminal.com/api/v2/networks'
    },
    {
      name: 'GeckoTerminal Solana Pools',
      url: 'https://api.geckoterminal.com/api/v2/networks/solana/pools'
    },
    {
      name: 'GeckoTerminal New Pools',
      url: 'https://api.geckoterminal.com/api/v2/networks/solana/new_pools'
    },
    {
      name: 'GeckoTerminal Trending',
      url: 'https://api.geckoterminal.com/api/v2/networks/solana/trending_pools'
    },
    
    // CoinGecko
    {
      name: 'CoinGecko Trending',
      url: 'https://api.coingecko.com/api/v3/search/trending'
    },
    
    // Pump.fun
    {
      name: 'Pump.fun Coins',
      url: 'https://frontend-api.pump.fun/coins'
    },
    {
      name: 'Pump.fun (Alternative)',
      url: 'https://pump.fun/api/coins'
    },
    
    // Raydium
    {
      name: 'Raydium Pairs',
      url: 'https://api.raydium.io/v2/main/pairs'
    },
    {
      name: 'Raydium Pools',
      url: 'https://api.raydium.io/v2/main/pools'
    },
    
    // Orca
    {
      name: 'Orca Whirlpools',
      url: 'https://api.mainnet.orca.so/v1/whirlpool/list'
    }
  ];
  
  const results = [];
  
  for (const endpoint of endpoints) {
    const success = await testEndpoint(endpoint.name, endpoint.url);
    results.push({ name: endpoint.name, success });
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
  }
  
  console.log('\n\n📊 SUMMARY:');
  console.log('✅ Working endpoints:');
  results.filter(r => r.success).forEach(r => console.log(`   - ${r.name}`));
  
  console.log('\n❌ Failed endpoints:');
  results.filter(r => !r.success).forEach(r => console.log(`   - ${r.name}`));
  
  console.log('\n💡 Recommendation:');
  const working = results.filter(r => r.success).length;
  if (working === 0) {
    console.log('   ⚠️  No endpoints working! Check your internet connection or try a VPN.');
  } else {
    console.log(`   ✅ ${working} endpoints are working. Update scanner to use these.`);
  }
}

// Run the tests
runTests().catch(console.error);