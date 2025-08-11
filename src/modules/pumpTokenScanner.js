// pumpTokenScanner.js - Real Pump.fun token scanner
// Location: Desktop/HootBot/pumpTokenScanner.js (ROOT)

const axios = require('axios');

// Scan Pump.fun for NEW tokens (not Jupiter's top tokens)
async function scanPumpFunTokens() {
  console.log('🔍 Scanning Pump.fun for NEW tokens...');
  
  try {
    // Use the Pump.fun API to get latest coins
    const response = await axios.get('https://frontend-api.pump.fun/coins', {
      params: {
        offset: 0,
        limit: 50,
        sort: 'created',
        order: 'desc',
        includeNsfw: false
      },
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data) {
      console.log('No data from Pump.fun');
      return [];
    }
    
    const tokens = response.data;
    console.log(`Found ${tokens.length} tokens from Pump.fun`);
    
    // Process and score tokens
    const scoredTokens = tokens
      .filter(token => {
        // Filter out very new tokens (less than 5 minutes old)
        const ageMinutes = (Date.now() - new Date(token.created_timestamp || token.created).getTime()) / 60000;
        return ageMinutes > 5 && ageMinutes < 1440; // Between 5 mins and 24 hours
      })
      .map(token => {
        const marketCap = token.usd_market_cap || 0;
        const volume = token.volume || 0;
        const ageHours = (Date.now() - new Date(token.created_timestamp || token.created).getTime()) / 3600000;
        
        return {
          mint: token.mint,
          symbol: token.symbol,
          name: token.name,
          source: 'pump.fun',
          marketCap: marketCap,
          volume: volume,
          created: token.created_timestamp || token.created,
          ageHours: ageHours,
          description: token.description,
          score: calculatePumpScore(marketCap, volume, ageHours)
        };
      })
      .sort((a, b) => b.score - a.score);
    
    return scoredTokens.slice(0, 20); // Top 20 tokens
    
  } catch (error) {
    console.error('Error scanning Pump.fun:', error.message);
    return [];
  }
}

// Calculate score for Pump.fun tokens
function calculatePumpScore(marketCap, volume, ageHours) {
  let score = 50; // Base score
  
  // Market cap score (lower is better for early entry)
  if (marketCap < 10000) score += 30;
  else if (marketCap < 50000) score += 20;
  else if (marketCap < 100000) score += 10;
  else if (marketCap < 500000) score += 5;
  
  // Volume score (higher is better)
  if (volume > 50000) score += 20;
  else if (volume > 20000) score += 15;
  else if (volume > 10000) score += 10;
  else if (volume > 5000) score += 5;
  
  // Age score (sweet spot is 2-12 hours)
  if (ageHours >= 2 && ageHours <= 12) score += 15;
  else if (ageHours < 2) score += 5;
  else if (ageHours > 12 && ageHours <= 24) score += 10;
  
  return Math.min(score, 100);
}

// Also scan DexScreener for comparison
async function scanDexScreenerNew() {
  try {
    console.log('📊 Scanning DexScreener for new Solana tokens...');
    
    const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/solana', {
      timeout: 5000
    });
    
    if (!response.data || !response.data.pairs) {
      return [];
    }
    
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    
    const newTokens = response.data.pairs
      .filter(pair => {
        const created = pair.pairCreatedAt || 0;
        return created > oneHourAgo && 
               pair.volume && 
               pair.volume.h24 > 1000 &&
               pair.baseToken;
      })
      .map(pair => ({
        mint: pair.baseToken.address,
        symbol: pair.baseToken.symbol,
        name: pair.baseToken.name,
        source: 'dexscreener',
        marketCap: pair.fdv || 0,
        volume: parseFloat(pair.volume.h24) || 0,
        liquidity: parseFloat(pair.liquidity?.usd) || 0,
        priceChange: pair.priceChange?.h24 || 0,
        score: 60 + (pair.volume.h24 > 10000 ? 20 : 0) + (pair.liquidity?.usd > 10000 ? 10 : 0)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
    
    return newTokens;
    
  } catch (error) {
    console.error('DexScreener error:', error.message);
    return [];
  }
}

// Combined scanner that prioritizes NEW tokens
async function scanAllNewTokens() {
  console.log('\n🚀 Scanning for NEW tokens (not established ones)...\n');
  
  const [pumpTokens, dexTokens] = await Promise.all([
    scanPumpFunTokens(),
    scanDexScreenerNew()
  ]);
  
  console.log(`Results: ${pumpTokens.length} from Pump.fun, ${dexTokens.length} from DexScreener`);
  
  // Combine and sort by score
  const allTokens = [...pumpTokens, ...dexTokens]
    .sort((a, b) => b.score - a.score);
  
  // Show top 5 for visibility
  if (allTokens.length > 0) {
    console.log('\n🔥 Top NEW tokens found:');
    allTokens.slice(0, 5).forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol} (${token.source}) - Score: ${token.score}`);
      console.log(`   MC: $${(token.marketCap || 0).toLocaleString()}, Vol: $${(token.volume || 0).toLocaleString()}`);
    });
  }
  
  return allTokens;
}

// Test the scanner
async function testScanner() {
  console.log('🧪 Testing NEW token scanner...\n');
  
  const tokens = await scanAllNewTokens();
  
  if (tokens.length === 0) {
    console.log('❌ No new tokens found');
  } else {
    console.log(`\n✅ Found ${tokens.length} new tokens ready for analysis`);
  }
  
  return tokens;
}

// Export for use in trading bot
module.exports = {
  scanPumpFunTokens,
  scanDexScreenerNew,
  scanAllNewTokens,
  testScanner
};

// Run test if called directly
if (require.main === module) {
  testScanner().catch(console.error);
}