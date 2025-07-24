// dist/pumpTools/tokenScanner.js - Simplified working version
const axios = require('axios');

// Scan DexScreener for new Solana tokens
async function scanDexScreener() {
  try {
    console.log('📊 Scanning DexScreener for new tokens...');
    
    const response = await axios.get('https://api.dexscreener.com/latest/dex/tokens/solana', {
      timeout: 5000
    });
    
    if (!response.data || !response.data.pairs) {
      console.log('No DexScreener data received');
      return [];
    }
    
    // Get tokens from last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    const tokens = [];
    
    // Process each pair safely
    for (const pair of response.data.pairs) {
      try {
        // Skip if missing required data
        if (!pair || !pair.baseToken || !pair.volume || !pair.liquidity) continue;
        
        // Apply filters
        const pairAge = pair.pairCreatedAt || 0;
        const volume24h = parseFloat(pair.volume.h24) || 0;
        const liquidityUsd = parseFloat(pair.liquidity.usd) || 0;
        
        if (pairAge > oneDayAgo && volume24h > 5000 && liquidityUsd > 5000) {
          tokens.push({
            mint: pair.baseToken.address,
            symbol: pair.baseToken.symbol || 'UNKNOWN',
            name: pair.baseToken.name || pair.baseToken.symbol || 'Unknown',
            source: 'dexscreener',
            marketCap: pair.fdv || 0,
            volume: volume24h,
            liquidity: liquidityUsd,
            priceChange: pair.priceChange ? pair.priceChange.h24 : 0,
            url: pair.url || `https://dexscreener.com/solana/${pair.baseToken.address}`,
            score: calculateDexScore(volume24h, liquidityUsd, pair.priceChange ? pair.priceChange.h24 : 0)
          });
        }
      } catch (err) {
        // Skip problematic pairs
        continue;
      }
    }
    
    // Sort by score and return top 10
    return tokens
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
  } catch (error) {
    console.error('DexScreener error:', error.message);
    return [];
  }
}

// Simplified Jupiter scanner
async function scanJupiterTokens() {
  try {
    console.log('🪐 Scanning Jupiter top tokens...');
    
    // Use the simpler strict list endpoint
    const response = await axios.get('https://token.jup.ag/strict', {
      timeout: 5000
    });
    
    if (!response.data || !Array.isArray(response.data)) {
      console.log('No Jupiter data received');
      return [];
    }
    
    // Get random selection of verified tokens
    const tokens = response.data
      .filter(token => token.symbol && token.address && !['USDC', 'USDT', 'SOL'].includes(token.symbol))
      .slice(0, 20)
      .map(token => ({
        mint: token.address,
        symbol: token.symbol,
        name: token.name || token.symbol,
        source: 'jupiter',
        decimals: token.decimals,
        score: 70 // Base score for verified Jupiter tokens
      }));
    
    return tokens.slice(0, 10);
    
  } catch (error) {
    console.error('Jupiter error:', error.message);
    return [];
  }
}

// Calculate score for DexScreener tokens
function calculateDexScore(volume, liquidity, priceChange) {
  let score = 60;
  
  // Volume score
  if (volume > 100000) score += 25;
  else if (volume > 50000) score += 20;
  else if (volume > 20000) score += 10;
  
  // Liquidity score
  if (liquidity > 50000) score += 10;
  else if (liquidity > 20000) score += 5;
  
  // Price momentum
  if (priceChange > 50) score += 5;
  
  return Math.min(score, 100);
}

// Simple combined scanner
async function scanAllTokens() {
  console.log('🚀 Starting token scan...\n');
  
  const [dexTokens, jupiterTokens] = await Promise.all([
    scanDexScreener(),
    scanJupiterTokens()
  ]);
  
  console.log(`Found: ${dexTokens.length} from DexScreener, ${jupiterTokens.length} from Jupiter\n`);
  
  // Combine all tokens
  const allTokens = [...dexTokens, ...jupiterTokens];
  
  // Sort by score
  return allTokens.sort((a, b) => (b.score || 0) - (a.score || 0));
}

// Export all functions
module.exports = {
  scanDexScreener,
  scanJupiterTokens,
  scanAllTokens,
  
  // Also export placeholder for pump (returns empty for now)
  scanPumpTokens: async () => {
    console.log('🔍 Pump.fun scanning disabled (Cloudflare protection)');
    return [];
  }
};