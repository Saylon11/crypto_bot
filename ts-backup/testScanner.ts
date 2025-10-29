// HootBot/src/scanners/testScanner.ts

import { integratedMarketScanner } from './integratedMarketScanner';
import { mindIntegration } from '../mindIntegration';

/**
 * Test scanner to see current market opportunities
 */
async function testScanner() {
  console.log('🔍 HootBot Market Scanner Test');
  console.log('==============================\n');
  
  try {
    // 1. Run market scan
    console.log('📊 Scanning all markets...\n');
    
    const results = await integratedMarketScanner.scanAllMarkets({
      minMarketCap: 10000,    // $10k min
      maxMarketCap: 5000000,  // $5M max
      minVolume: 5000,        // $5k daily volume
      minLiquidity: 10000     // $10k liquidity
    });
    
    console.log(`Found ${results.allTokens.length} total opportunities\n`);
    
    // 2. Show top Pump.fun tokens
    console.log('⛲ TOP PUMP.FUN TOKENS (Pre-graduated):');
    console.log('=====================================');
    
    results.pumpTokens.slice(0, 5).forEach((token, i) => {
      console.log(`\n${i + 1}. ${token.symbol} (${token.name})`);
      console.log(`   Address: ${token.mint}`);
      console.log(`   Price: $${token.price.toFixed(8)}`);
      console.log(`   Market Cap: $${token.marketCap.toLocaleString()}`);
      console.log(`   24h Volume: $${token.volume24h.toLocaleString()}`);
      console.log(`   Liquidity: $${token.liquidity.toLocaleString()}`);
      console.log(`   Age: ${token.ageHours ? token.ageHours.toFixed(1) : 'Unknown'} hours`);
      if (token.score) console.log(`   Score: ${token.score}/100`);
    });
    
    // 3. Show top Raydium tokens
    console.log('\n\n🌊 TOP RAYDIUM TOKENS (Graduated):');
    console.log('=================================');
    
    results.raydiumTokens.slice(0, 5).forEach((token, i) => {
      console.log(`\n${i + 1}. ${token.symbol} (${token.name})`);
      console.log(`   Address: ${token.mint}`);
      console.log(`   Price: $${token.price.toFixed(8)}`);
      console.log(`   Market Cap: $${token.marketCap.toLocaleString()}`);
      console.log(`   24h Volume: $${token.volume24h.toLocaleString()}`);
      console.log(`   Liquidity: $${token.liquidity.toLocaleString()}`);
      console.log(`   24h Change: ${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h.toFixed(1)}%`);
      if (token.txns24h) console.log(`   Transactions: ${token.txns24h.toLocaleString()}`);
    });
    
    // 4. Get market movers
    console.log('\n\n📈 MARKET MOVERS:');
    console.log('================');
    
    const movers = await integratedMarketScanner.getMarketMovers(3);
    
    console.log('\n🚀 Top Gainers:');
    movers.topGainers.forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol}: +${token.priceChange24h.toFixed(1)}% | MC: $${token.marketCap.toLocaleString()}`);
    });
    
    console.log('\n💰 Top Volume:');
    movers.topVolume.forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol}: $${token.volume24h.toLocaleString()} | ${token.source}`);
    });
    
    console.log('\n🆕 New Listings:');
    movers.newListings.forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol}: ${token.ageHours?.toFixed(1)} hours old | MC: $${token.marketCap.toLocaleString()}`);
    });
    
    // 5. Get MIND's market analysis
    console.log('\n\n🧠 MIND MARKET ANALYSIS:');
    console.log('=======================');
    
    const analysis = await mindIntegration.getMarketAnalysis();
    console.log(`\nMarket Condition: ${analysis.marketCondition.toUpperCase()}`);
    console.log(`Risk Level: ${analysis.riskLevel}`);
    console.log('\nRecommendations:');
    analysis.recommendations.forEach(rec => console.log(`  • ${rec}`));
    
    // 6. Show a specific token MIND would trade
    if (results.allTokens.length > 0) {
      const topToken = results.allTokens[0];
      console.log(`\n\n🎯 MIND Analysis for Top Token: ${topToken.symbol}`);
      console.log('=====================================');
      
      const decision = await mindIntegration.getTokenDecision(topToken.mint);
      console.log(`Action: ${decision.action}`);
      console.log(`Confidence: ${decision.confidence}%`);
      console.log(`Reasoning: ${decision.reasoning}`);
      if (decision.suggestedAmount) {
        console.log(`Suggested Amount: ${decision.suggestedAmount} SOL`);
      }
    }
    
  } catch (error) {
    console.error('❌ Scanner test failed:', error);
  }
}

// Run the test
testScanner()
  .then(() => {
    console.log('\n✅ Scanner test complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });