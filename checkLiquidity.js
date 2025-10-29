// HootBot/checkLiquidity.js
// Quick script to check if a token has enough liquidity to exit

const axios = require('axios');

async function checkTokenLiquidity(tokenAddress) {
  console.log(`\n🔍 Checking liquidity for: ${tokenAddress}\n`);
  
  try {
    // Try Jupiter price API
    const jupiterUrl = `https://price.jup.ag/v6/price?ids=${tokenAddress}`;
    const jupResponse = await axios.get(jupiterUrl);
    
    if (jupResponse.data?.data?.[tokenAddress]) {
      const data = jupResponse.data.data[tokenAddress];
      console.log('✅ Jupiter Support: YES');
      console.log(`   Price: $${data.price}`);
      return true;
    } else {
      console.log('❌ Jupiter Support: NO');
    }
    
    // Check DexScreener
    const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const dexResponse = await axios.get(dexUrl);
    
    if (dexResponse.data?.pairs?.length > 0) {
      console.log('\n📊 DexScreener Pairs:');
      dexResponse.data.pairs.slice(0, 3).forEach(pair => {
        console.log(`\n   ${pair.baseToken.symbol}/${pair.quoteToken.symbol}`);
        console.log(`   Liquidity: $${parseInt(pair.liquidity?.usd || 0).toLocaleString()}`);
        console.log(`   Volume 24h: $${parseInt(pair.volume?.h24 || 0).toLocaleString()}`);
        console.log(`   Buys: ${pair.txns?.h24?.buys || 0}, Sells: ${pair.txns?.h24?.sells || 0}`);
        console.log(`   DEX: ${pair.dexId}`);
      });
      
      const totalLiquidity = dexResponse.data.pairs.reduce((sum, pair) => 
        sum + parseFloat(pair.liquidity?.usd || 0), 0
      );
      
      console.log(`\n💰 Total Liquidity: $${totalLiquidity.toLocaleString()}`);
      
      if (totalLiquidity < 20000) {
        console.log('⚠️  WARNING: Low liquidity! May be hard to sell!');
      }
      
      return totalLiquidity > 10000;
    }
    
  } catch (error) {
    console.error('Error checking liquidity:', error.message);
  }
  
  console.log('\n❌ No liquidity data found - likely unsellable!');
  return false;
}

// Check your positions
async function checkYourPositions() {
  const positions = [
    { symbol: 'SLOPMAXX', address: '2fTAAhg8yGRpfoaa6tugRDrBkE12S69x91fYqBSiAz7f' },
    { symbol: 'Pomme', address: '5bjc18C3nVAqryzj7wp2BuE23rNAuMXXY32oyQqmpump' }
  ];
  
  console.log('🦉 Checking HootBot Positions Liquidity...\n');
  
  for (const pos of positions) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Token: ${pos.symbol}`);
    const canSell = await checkTokenLiquidity(pos.address);
    console.log(`\nCan Sell: ${canSell ? '✅ YES' : '❌ NO'}`);
  }
}

// Run if called directly
if (require.main === module) {
  checkYourPositions();
}

module.exports = { checkTokenLiquidity };