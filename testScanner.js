// testScanner.js
const { scanPumpTokens, scanJupiterTokens, scanDexScreener, scanAllTokens } = require('./dist/pumpTools/tokenScanner');

async function test() {
  console.log('🧪 Testing Token Scanner...\n');
  
  // Test Pump.fun scanner
  console.log('Testing Pump.fun scanner:');
  const pumpTokens = await scanPumpTokens();
  
  if (pumpTokens.length > 0) {
    console.log(`✅ Found ${pumpTokens.length} Pump tokens\n`);
    console.log('Top 3 tokens:');
    pumpTokens.slice(0, 3).forEach((token, i) => {
      console.log(`${i + 1}. ${token.symbol} - Score: ${token.score}`);
      console.log(`   Mint: ${token.mint}`);
    });
  } else {
    console.log('❌ No Pump tokens found\n');
  }
  
  console.log('\n' + '-'.repeat(50) + '\n');
  
  // Test DexScreener
  console.log('Testing DexScreener:');
  const dexTokens = await scanDexScreener();
  
  if (dexTokens.length > 0) {
    console.log(`✅ Found ${dexTokens.length} DexScreener tokens\n`);
    console.log('Top new token:');
    const topDex = dexTokens[0];
    console.log(`${topDex.symbol} - Score: ${topDex.score}`);
    console.log(`Volume: ${topDex.volume?.toLocaleString()}`);
    console.log(`Liquidity: ${topDex.liquidity?.toLocaleString()}`);
  }
  
  console.log('\n' + '-'.repeat(50) + '\n');
  
  // Test combined scanner
  console.log('Testing combined scanner:');
  const allTokens = await scanAllTokens();
  
  if (allTokens.length > 0) {
    console.log(`✅ Found ${allTokens.length} total tokens\n`);
    console.log('Top token:');
    const top = allTokens[0];
    console.log(`${top.symbol} (${top.source})`);
    console.log(`Score: ${top.score}`);
    console.log(`Volume: $${top.volume?.toLocaleString() || 'N/A'}`);
  }
}

test().catch(console.error);