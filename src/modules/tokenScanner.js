// /Users/owner/Desktop/HootBot/src/modules/geckoScanner.js
// Working scanner using Gecko Terminal API

const axios = require('axios');

// Simple config
const CONFIG = {
  minMarketCap: 50000,
  maxMarketCap: 10000000,
  minVolume: 10000,
  minLiquidity: 5000
};

async function scanTokens() {
  try {
    console.log('📊 Fetching from Gecko Terminal...');
    
    // Use the Gecko Terminal API endpoint for Solana
    const response = await axios.get('https://api.geckoterminal.com/api/v2/networks/solana/trending_pools', {
      timeout: 10000,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.data?.data) {
      console.log('No data from Gecko Terminal');
      return [];
    }
    
    const tokens = [];
    
    for (const pool of response.data.data) {
      try {
        const attributes = pool.attributes;
        if (!attributes) continue;
        
        const marketCap = parseFloat(attributes.market_cap_usd || attributes.fdv_usd || 0);
        const volume = parseFloat(attributes.volume_usd?.h24 || 0);
        const liquidity = parseFloat(attributes.reserve_in_usd || 0);
        
        // Check if in our target range
        if (marketCap >= CONFIG.minMarketCap && 
            marketCap <= CONFIG.maxMarketCap &&
            volume >= CONFIG.minVolume &&
            liquidity >= CONFIG.minLiquidity) {
          
          tokens.push({
            mint: attributes.base_token_address || pool.id,
            symbol: attributes.name?.split('/')[0] || 'UNKNOWN',
            name: attributes.name || 'Unknown',
            marketCap: marketCap,
            volume: volume,
            liquidity: liquidity,
            priceChange: parseFloat(attributes.price_change_percentage?.h24 || 0),
            poolAddress: attributes.address,
            score: calculateScore(marketCap, volume, liquidity)
          });
        }
      } catch (e) {
        continue;
      }
    }
    
    // If no trending pools in range, try new pools
    if (tokens.length === 0) {
      console.log('Checking new pools...');
      
      const newPoolsResponse = await axios.get('https://api.geckoterminal.com/api/v2/networks/solana/new_pools', {
        timeout: 10000,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (newPoolsResponse.data?.data) {
        for (const pool of newPoolsResponse.data.data) {
          try {
            const attributes = pool.attributes;
            if (!attributes) continue;
            
            const marketCap = parseFloat(attributes.market_cap_usd || attributes.fdv_usd || 0);
            const volume = parseFloat(attributes.volume_usd?.h24 || 0);
            const liquidity = parseFloat(attributes.reserve_in_usd || 0);
            
            if (marketCap >= CONFIG.minMarketCap && 
                marketCap <= CONFIG.maxMarketCap &&
                volume >= CONFIG.minVolume &&
                liquidity >= CONFIG.minLiquidity) {
              
              tokens.push({
                mint: attributes.base_token_address || pool.id,
                symbol: attributes.name?.split('/')[0] || 'UNKNOWN',
                name: attributes.name || 'Unknown',
                marketCap: marketCap,
                volume: volume,
                liquidity: liquidity,
                priceChange: parseFloat(attributes.price_change_percentage?.h24 || 0),
                poolAddress: attributes.address,
                score: calculateScore(marketCap, volume, liquidity)
              });
            }
          } catch (e) {
            continue;
          }
        }
      }
    }
    
    // Sort by score
    return tokens.sort((a, b) => b.score - a.score).slice(0, 20);
    
  } catch (error) {
    console.error('Scanner error:', error.message);
    return [];
  }
}

function calculateScore(marketCap, volume, liquidity) {
  let score = 50;
  
  // Smaller market cap = higher potential
  if (marketCap < 100000) score += 20;
  else if (marketCap < 500000) score += 15;
  else if (marketCap < 1000000) score += 10;
  
  // Volume activity
  if (volume > 100000) score += 20;
  else if (volume > 50000) score += 15;
  else if (volume > 25000) score += 10;
  
  // Liquidity safety
  if (liquidity > 50000) score += 10;
  else if (liquidity > 25000) score += 5;
  
  return Math.min(score, 100);
}

// Export for use in other modules
module.exports = {
  scanTokens,
  CONFIG
};

// Test function
async function testScanner() {
  console.log('🦎 Testing Gecko Terminal scanner...\n');
  
  const tokens = await scanTokens();
  
  if (tokens.length > 0) {
    console.log(`✅ Found ${tokens.length} tokens!\n`);
    console.log('Top 5:');
    tokens.slice(0, 5).forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol} - MC: $${token.marketCap.toLocaleString()} - Score: ${token.score}`);
    });
  } else {
    console.log('❌ No tokens found in target range ($50K-$10M)');
  }
}

// Run test if called directly
if (require.main === module) {
  testScanner();
}