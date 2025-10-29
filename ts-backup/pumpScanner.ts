// @ts-nocheck
// pumpScanner.js - Standalone scanner for HootBot
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Simple token scanner for Pump.fun
async function scanPumpTokens() {
  console.log('🔍 Scanning Pump.fun for new tokens...');
  
  try {
    // Pump.fun API endpoint
    const response = await axios.get('https://frontend-api.pump.fun/coins', {
      timeout: 5000,
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.data) {
      console.log('No data received from Pump.fun');
      return [];
    }
    
    // Filter and format tokens
    const tokens = response.data
      .filter(token => {
        // Filter criteria
        return token.market_cap < 500000 && // Under $500k
               token.volume_24h > 5000 &&    // Over $5k volume
               token.created_at;             // Has creation date
      })
      .map(token => ({
        mint: token.mint,
        symbol: token.symbol,
        name: token.name,
        marketCap: token.market_cap,
        volume24h: token.volume_24h,
        created: new Date(token.created_at),
        age: Math.floor((Date.now() - new Date(token.created_at).getTime()) / (1000 * 60 * 60)), // hours
        score: calculateScore(token)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10); // Top 10
    
    return tokens;
    
  } catch (error) {
    console.error('Error scanning Pump.fun:', error.message);
    
    // Try alternative endpoint
    try {
      const altResponse = await axios.get('https://pump.fun/api/coins');
      return parseAlternativeResponse(altResponse.data);
    } catch (altError) {
      console.error('Alternative endpoint also failed');
      return [];
    }
  }
}

// Calculate opportunity score
function calculateScore(token) {
  let score = 0;
  
  // Volume score (0-40 points)
  if (token.volume_24h > 50000) score += 40;
  else if (token.volume_24h > 20000) score += 30;
  else if (token.volume_24h > 10000) score += 20;
  else if (token.volume_24h > 5000) score += 10;
  
  // Market cap score (0-30 points) - lower is better
  if (token.market_cap < 50000) score += 30;
  else if (token.market_cap < 100000) score += 20;
  else if (token.market_cap < 250000) score += 10;
  
  // Age score (0-20 points) - newer is better
  const ageHours = (Date.now() - new Date(token.created_at).getTime()) / (1000 * 60 * 60);
  if (ageHours < 6) score += 20;
  else if (ageHours < 12) score += 15;
  else if (ageHours < 24) score += 10;
  else if (ageHours < 48) score += 5;
  
  // Momentum score (0-10 points)
  if (token.price_change_24h > 50) score += 10;
  else if (token.price_change_24h > 20) score += 5;
  
  return score;
}

// Display results
function displayTokens(tokens) {
  console.log('\n🏆 TOP PUMP.FUN OPPORTUNITIES:\n');
  
  tokens.forEach((token, index) => {
    console.log(`${index + 1}. ${token.symbol} (${token.name})`);
    console.log(`   Mint: ${token.mint}`);
    console.log(`   Market Cap: $${token.marketCap?.toLocaleString()}`);
    console.log(`   24h Volume: $${token.volume24h?.toLocaleString()}`);
    console.log(`   Age: ${token.age} hours`);
    console.log(`   Score: ${token.score}/100`);
    console.log('');
  });
}

// Scan and analyze with MIND
async function scanAndAnalyze() {
  const tokens = await scanPumpTokens();
  
  if (tokens.length === 0) {
    console.log('No suitable tokens found');
    return null;
  }
  
  displayTokens(tokens);
  
  // Return top token for MIND analysis
  return tokens[0];
}

// Continuous scanner
async function continuousScan(intervalMinutes = 5) {
  console.log(`🔄 Starting continuous scan every ${intervalMinutes} minutes...\n`);
  
  while (true) {
    const tokens = await scanPumpTokens();
    
    if (tokens.length > 0) {
      displayTokens(tokens);
      
      // Check for high score tokens
      const hotTokens = tokens.filter(t => t.score >= 70);
      if (hotTokens.length > 0) {
        console.log(`🚨 ALERT: ${hotTokens.length} HIGH SCORE TOKENS FOUND!`);
        hotTokens.forEach(t => {
          console.log(`   🔥 ${t.symbol} - Score: ${t.score}/100`);
        });
      }
    }
    
    console.log(`\n⏳ Next scan in ${intervalMinutes} minutes...\n`);
    await new Promise(resolve => setTimeout(resolve, intervalMinutes * 60 * 1000));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--continuous')) {
    await continuousScan(5);
  } else if (args.includes('--analyze')) {
    const topToken = await scanAndAnalyze();
    if (topToken) {
      console.log(`\n💡 To analyze ${topToken.symbol} with MIND:`);
      console.log(`   Set TARGET_TOKEN_MINT=${topToken.mint}`);
      console.log(`   Then run: node dist/mindEngine.js`);
    }
  } else {
    // Single scan
    const tokens = await scanPumpTokens();
    displayTokens(tokens);
  }
}

// Export for use in other scripts
module.exports = {
  scanPumpTokens,
  scanAndAnalyze,
  displayTokens
};

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}