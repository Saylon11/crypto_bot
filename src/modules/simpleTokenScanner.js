// /Users/owner/Desktop/HootBot/src/modules/simpleTokenScanner.js
// Simplified scanner that actually works

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
    // Try the pairs endpoint which often works better
    const response = await axios.get('https://api.dexscreener.com/latest/dex/pairs/solana', {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data?.pairs) {
      console.log('No data from DexScreener');
      return [];
    }
    
    const tokens = [];
    
    for (const pair of response.data.pairs) {
      try {
        if (!pair.baseToken?.address) continue;
        
        const marketCap = pair.fdv || pair.marketCap || 0;
        const volume = parseFloat(pair.volume?.h24 || 0);
        const liquidity = parseFloat(pair.liquidity?.usd || 0);
        
        // Check if in our target range
        if (marketCap >= CONFIG.minMarketCap && 
            marketCap <= CONFIG.maxMarketCap &&
            volume >= CONFIG.minVolume &&
            liquidity >= CONFIG.minLiquidity) {
          
          tokens.push({
            mint: pair.baseToken.address,
            symbol: pair.baseToken.symbol || 'UNKNOWN',
            name: pair.baseToken.name || pair.baseToken.symbol,
            marketCap: marketCap,
            volume: volume,
            liquidity: liquidity,
            priceChange: parseFloat(pair.priceChange?.h24 || 0),
            url: `https://dexscreener.com/solana/${pair.baseToken.address}`,
            score: calculateScore(marketCap, volume, liquidity)
          });
        }
      } catch (e) {
        continue;
      }
    }
    
    // Sort by score
    return tokens.sort((a, b) => b.score - a.score).slice(0, 20);
    
  } catch (error) {
    console.error('Scanner error:', error.message);
    
    // Fallback: try direct token search
    try {
      console.log('Trying fallback search...');
      const fallbackResponse = await axios.get('https://api.dexscreener.com/latest/dex/search?q=SOL', {
        timeout: 5000
      });
      
      if (fallbackResponse.data?.pairs) {
        console.log('Fallback found some data');
        // Process similar to above
      }
    } catch (e) {
      console.log('Fallback also failed');
    }
    
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

// Simple test function
async function testScanner() {
  console.log('🧪 Testing simple scanner...\n');
  
  const tokens = await scanTokens();
  
  if (tokens.length > 0) {
    console.log(`✅ Found ${tokens.length} tokens!\n`);
    console.log('Top 5:');
    tokens.slice(0, 5).forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol} - MC: $${token.marketCap.toLocaleString()} - Score: ${token.score}`);
    });
  } else {
    console.log('❌ No tokens found');
  }
}

module.exports = {
  scanTokens,
  CONFIG
};

// Run test if called directly
if (require.main === module) {
  testScanner();
}