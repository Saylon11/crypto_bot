// robustTokenScanner.js - HootBot Multi-Source Token Scanner
const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');

// Scanner configuration
const CONFIG = {
  MIN_LIQUIDITY: 5000,
  MIN_VOLUME: 1000,
  MAX_AGE_HOURS: 24,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

// Helper to make requests with retries
async function makeRequest(url, options = {}) {
  const defaultOptions = {
    timeout: 10000,
    headers: {
      'Accept': 'application/json',
      'User-Agent': CONFIG.USER_AGENT,
      ...options.headers
    }
  };
  
  try {
    const response = await axios.get(url, { ...defaultOptions, ...options });
    return response.data;
  } catch (error) {
    if (error.response?.status === 429) {
      console.log('Rate limited, waiting 2s...');
      await new Promise(r => setTimeout(r, 2000));
      return makeRequest(url, options);
    }
    throw error;
  }
}

// Scanner 1: DexScreener with different approach
async function scanDexScreenerAlternative() {
  try {
    console.log('📊 Scanning DexScreener (alternative method)...');
    
    // Try searching for high volume tokens
    const searchTerms = ['pump', 'moon', 'sol', 'meme', 'pepe', 'doge'];
    const allTokens = [];
    
    for (const term of searchTerms.slice(0, 3)) {
      try {
        const data = await makeRequest(
          `https://api.dexscreener.com/latest/dex/search?q=${term}`,
          { timeout: 5000 }
        );
        
        if (data?.pairs) {
          const solanaTokens = data.pairs
            .filter(p => p.chainId === 'solana')
            .filter(p => parseFloat(p.liquidity?.usd || 0) >= CONFIG.MIN_LIQUIDITY)
            .filter(p => parseFloat(p.volume?.h24 || 0) >= CONFIG.MIN_VOLUME);
          
          allTokens.push(...solanaTokens);
        }
        
        await new Promise(r => setTimeout(r, 500)); // Rate limit prevention
      } catch (err) {
        // Continue with next search term
      }
    }
    
    // Deduplicate and format
    const uniqueTokens = new Map();
    allTokens.forEach(pair => {
      if (!uniqueTokens.has(pair.pairAddress)) {
        uniqueTokens.set(pair.pairAddress, {
          mint: pair.baseToken.address,
          symbol: pair.baseToken.symbol,
          name: pair.baseToken.name,
          source: 'dexscreener',
          dex: pair.dexId,
          volume: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          priceChange: parseFloat(pair.priceChange?.h24 || 0),
          score: calculateScore(pair),
          url: pair.url
        });
      }
    });
    
    return Array.from(uniqueTokens.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);
    
  } catch (error) {
    console.error('DexScreener alternative failed:', error.message);
    return [];
  }
}

// Scanner 2: Direct Solana blockchain scan for new tokens
async function scanSolanaNewTokens(connection) {
  try {
    console.log('⛓️ Scanning Solana blockchain for new tokens...');
    
    // Get recent signatures
    const signatures = await connection.getSignaturesForAddress(
      new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'), // Token Program
      { limit: 100 }
    );
    
    console.log(`Found ${signatures.length} recent token transactions`);
    
    const tokens = [];
    const seenMints = new Set();
    
    // Check recent transactions
    for (const sig of signatures.slice(0, 20)) {
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0
        });
        
        if (!tx?.meta || tx.meta.err) continue;
        
        // Look for token creation
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          if (ix.programId.toString() === 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' &&
              ix.parsed?.type === 'initializeMint') {
            const mint = ix.parsed.info.mint;
            
            if (!seenMints.has(mint)) {
              seenMints.add(mint);
              tokens.push({
                mint,
                symbol: 'NEW',
                name: 'New Token',
                source: 'blockchain',
                age: Math.floor((Date.now() - sig.blockTime * 1000) / 1000 / 60), // minutes
                score: 60,
                needsAnalysis: true
              });
            }
          }
        }
      } catch (err) {
        // Skip problematic transactions
      }
    }
    
    return tokens.slice(0, 10);
    
  } catch (error) {
    console.error('Blockchain scan failed:', error.message);
    return [];
  }
}

// Scanner 3: Jupiter token list with volume data
async function scanJupiterActive() {
  try {
    console.log('🪐 Scanning Jupiter active tokens...');
    
    // Get Jupiter token list
    const tokenList = await makeRequest('https://token.jup.ag/all');
    
    if (!Array.isArray(tokenList)) {
      console.log('Invalid Jupiter response');
      return [];
    }
    
    // Filter for potentially interesting tokens
    const candidates = tokenList
      .filter(t => t.tags?.includes('community') || t.tags?.includes('meme'))
      .slice(0, 50);
    
    console.log(`Checking ${candidates.length} Jupiter tokens...`);
    
    const activeTokens = [];
    
    // Check each token's activity via DexScreener
    for (const token of candidates.slice(0, 10)) {
      try {
        const data = await makeRequest(
          `https://api.dexscreener.com/latest/dex/tokens/${token.address}`,
          { timeout: 3000 }
        );
        
        if (data?.pairs?.[0]) {
          const pair = data.pairs[0];
          const volume = parseFloat(pair.volume?.h24 || 0);
          const liquidity = parseFloat(pair.liquidity?.usd || 0);
          
          if (volume >= CONFIG.MIN_VOLUME && liquidity >= CONFIG.MIN_LIQUIDITY) {
            activeTokens.push({
              mint: token.address,
              symbol: token.symbol,
              name: token.name,
              source: 'jupiter',
              volume,
              liquidity,
              score: 70,
              url: `https://dexscreener.com/solana/${token.address}`
            });
          }
        }
        
        await new Promise(r => setTimeout(r, 200)); // Rate limit
      } catch (err) {
        // Skip token
      }
    }
    
    return activeTokens;
    
  } catch (error) {
    console.error('Jupiter scan failed:', error.message);
    return [];
  }
}

// Scanner 4: GeckoTerminal API
async function scanGeckoTerminal() {
  try {
    console.log('🦎 Scanning GeckoTerminal...');
    
    const data = await makeRequest(
      'https://api.geckoterminal.com/api/v2/networks/solana/trending_pools',
      { timeout: 5000 }
    );
    
    if (!data?.data) return [];
    
    const tokens = [];
    
    for (const pool of data.data.slice(0, 10)) {
      const attrs = pool.attributes;
      const volume = parseFloat(attrs.volume_24h_usd || 0);
      const liquidity = parseFloat(attrs.reserve_in_usd || 0);
      
      if (volume >= CONFIG.MIN_VOLUME && liquidity >= CONFIG.MIN_LIQUIDITY) {
        tokens.push({
          mint: attrs.base_token_address,
          symbol: attrs.base_token_symbol,
          name: attrs.base_token_name,
          source: 'geckoterminal',
          volume,
          liquidity,
          priceChange: parseFloat(attrs.price_change_24h || 0),
          score: 75,
          url: `https://www.geckoterminal.com/solana/pools/${pool.id}`
        });
      }
    }
    
    return tokens;
    
  } catch (error) {
    console.log('GeckoTerminal not available');
    return [];
  }
}

// Calculate token score
function calculateScore(pair) {
  let score = 50;
  
  const volume = parseFloat(pair.volume?.h24 || 0);
  const liquidity = parseFloat(pair.liquidity?.usd || 0);
  const priceChange = parseFloat(pair.priceChange?.h24 || 0);
  
  // Volume scoring
  if (volume > 100000) score += 20;
  else if (volume > 50000) score += 15;
  else if (volume > 20000) score += 10;
  else if (volume > 10000) score += 5;
  
  // Liquidity scoring
  if (liquidity > 50000) score += 15;
  else if (liquidity > 20000) score += 10;
  else if (liquidity > 10000) score += 5;
  
  // Price momentum
  if (priceChange > 50) score += 10;
  else if (priceChange > 20) score += 5;
  else if (priceChange < -20) score -= 5;
  
  // Volume/liquidity ratio
  const ratio = volume / liquidity;
  if (ratio > 1 && ratio < 3) score += 5;
  
  return Math.min(100, Math.max(0, score));
}

// Main scanner combining all sources
async function scanAllTokens(connection) {
  console.log('🚀 Starting comprehensive token scan...\n');
  
  const conn = connection || new Connection(
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );
  
  try {
    // Run scanners in parallel with error handling
    const results = await Promise.allSettled([
      scanDexScreenerAlternative(),
      scanJupiterActive(),
      scanGeckoTerminal(),
      scanSolanaNewTokens(conn)
    ]);
    
    // Extract successful results
    const [dexTokens, jupiterTokens, geckoTokens, blockchainTokens] = results.map(
      result => result.status === 'fulfilled' ? result.value : []
    );
    
    console.log('\n📊 Scan Results:');
    console.log(`   DexScreener: ${dexTokens.length} tokens`);
    console.log(`   Jupiter: ${jupiterTokens.length} tokens`);
    console.log(`   GeckoTerminal: ${geckoTokens.length} tokens`);
    console.log(`   Blockchain: ${blockchainTokens.length} new tokens`);
    
    // Combine all tokens
    const allTokens = [...dexTokens, ...jupiterTokens, ...geckoTokens, ...blockchainTokens];
    
    // Deduplicate by mint address
    const tokenMap = new Map();
    allTokens.forEach(token => {
      const existing = tokenMap.get(token.mint);
      if (!existing || token.score > existing.score) {
        tokenMap.set(token.mint, token);
      }
    });
    
    const uniqueTokens = Array.from(tokenMap.values())
      .sort((a, b) => b.score - a.score);
    
    console.log(`   Total unique: ${uniqueTokens.length} tokens\n`);
    
    // Display top tokens
    if (uniqueTokens.length > 0) {
      console.log('🏆 Top 5 Opportunities:');
      uniqueTokens.slice(0, 5).forEach((token, i) => {
        console.log(`\n${i + 1}. ${token.symbol} (${token.source})`);
        console.log(`   Score: ${token.score}/100`);
        if (token.volume) console.log(`   Volume: $${token.volume.toLocaleString()}`);
        if (token.liquidity) console.log(`   Liquidity: $${token.liquidity.toLocaleString()}`);
        if (token.priceChange) console.log(`   24h: ${token.priceChange > 0 ? '+' : ''}${token.priceChange.toFixed(1)}%`);
        if (token.url) console.log(`   Info: ${token.url}`);
      });
    } else {
      console.log('❌ No tokens found. Possible reasons:');
      console.log('   - API rate limits (wait a few minutes)');
      console.log('   - Network issues');
      console.log('   - All tokens below minimum liquidity/volume thresholds');
    }
    
    return uniqueTokens;
    
  } catch (error) {
    console.error('Fatal scanner error:', error);
    return [];
  }
}

// Export functions
module.exports = {
  scanAllTokens,
  scanDexScreenerAlternative,
  scanJupiterActive,
  scanGeckoTerminal,
  scanSolanaNewTokens,
  
  // Legacy compatibility
  scanDexScreener: scanDexScreenerAlternative,
  scanJupiterTokens: scanJupiterActive,
  scanPumpTokens: async () => {
    console.log('🎯 Using multi-source scanner for all tokens');
    return scanAllTokens();
  }
};