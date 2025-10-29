// improvedSniper.js - More active sniper with better feedback
const { Connection, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const fetch = require('node-fetch');

// YOUR WALLET
const WALLET_ARRAY = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];

async function runSniper() {
  const wallet = Keypair.fromSecretKey(new Uint8Array(WALLET_ARRAY));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log('🦉 HootBot Token Sniper v2.0 - ACTIVE MODE');
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (balance < 0.02 * LAMPORTS_PER_SOL) {
    console.error('❌ Need at least 0.02 SOL');
    return;
  }
  
  console.log('\n📋 Settings:');
  console.log('   Auto-buy: Volume >$40k + Gain >40%');
  console.log('   Watch: Volume >$15k + Gain >15%');
  console.log('   Amount per trade: 0.01 SOL\n');
  
  const boughtTokens = new Set();
  let scanCount = 0;
  
  while (true) {
    try {
      scanCount++;
      console.log(`\n🔍 Scan #${scanCount} - ${new Date().toLocaleTimeString()}`);
      
      const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana');
      const data = await res.json();
      
      if (data.pairs) {
        // More relaxed criteria to see more tokens
        const interestingTokens = data.pairs
          .filter(p => {
            const vol = parseFloat(p.volume?.h24 || 0);
            const liq = parseFloat(p.liquidity?.usd || 0);
            const change = parseFloat(p.priceChange?.h24 || 0);
            return vol > 15000 && liq > 5000 && change > 15;
          })
          .sort((a, b) => parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0))
          .slice(0, 10);
        
        console.log(`Found ${interestingTokens.length} active tokens`);
        
        if (interestingTokens.length > 0) {
          // Show top 3 always
          console.log('\n📊 Top tokens this scan:');
          for (let i = 0; i < Math.min(3, interestingTokens.length); i++) {
            const t = interestingTokens[i];
            console.log(`${i+1}. ${t.baseToken.symbol} - Vol: $${parseInt(t.volume.h24).toLocaleString()}, +${t.priceChange?.h24||0}%`);
          }
          
          // Check for HOT tokens to auto-buy
          for (const token of interestingTokens) {
            const mint = token.baseToken.address;
            const symbol = token.baseToken.symbol;
            const vol = parseFloat(token.volume.h24);
            const change = parseFloat(token.priceChange?.h24 || 0);
            const age = (Date.now() - (token.pairCreatedAt || 0)) / (1000 * 60 * 60);
            
            // Skip if already bought
            if (boughtTokens.has(mint)) continue;
            
            // AUTO-BUY CONDITIONS
            if (vol > 40000 && change > 40 && age < 24) {
              console.log(`\n🔥 HOT TOKEN ALERT: ${symbol}`);
              console.log(`   Volume: $${vol.toLocaleString()}`);
              console.log(`   24h Gain: +${change.toFixed(1)}%`);
              console.log(`   Age: ${age.toFixed(1)}h`);
              console.log(`   🚀 AUTO-BUYING...`);
              
              try {
                const buyRes = await fetch('https://pumpportal.fun/api/trade-local', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    publicKey: wallet.publicKey.toString(),
                    action: 'buy',
                    mint: mint,
                    amount: 10000000, // 0.01 SOL
                    denominatedInSol: 'true',
                    slippage: 20, // Higher slippage for volatile tokens
                    priorityFee: 0.0005,
                    pool: 'pump'
                  })
                });
                
                if (buyRes.ok) {
                  const tx = VersionedTransaction.deserialize(new Uint8Array(await buyRes.arrayBuffer()));
                  tx.sign([wallet]);
                  const sig = await connection.sendTransaction(tx, { 
                    skipPreflight: true,
                    maxRetries: 3 
                  });
                  
                  console.log(`   ✅ BOUGHT! TX: ${sig}`);
                  console.log(`   View: https://solscan.io/tx/${sig}`);
                  boughtTokens.add(mint);
                  
                  await new Promise(r => setTimeout(r, 3000));
                } else {
                  console.log('   ⚠️  Not on Pump.fun, trying next token');
                }
              } catch (e) {
                console.log('   ❌ Error:', e.message);
              }
            }
            // WATCH LIST (potential buys)
            else if (vol > 25000 && change > 25) {
              console.log(`\n👀 WATCHING: ${symbol} - Vol: $${vol.toLocaleString()}, +${change}%`);
            }
          }
        }
      }
    } catch (e) {
      console.error('Scan error:', e.message);
    }
    
    // Show portfolio every 5 scans
    if (scanCount % 5 === 0 && boughtTokens.size > 0) {
      console.log(`\n💼 Portfolio: ${boughtTokens.size} tokens purchased`);
    }
    
    console.log('\n⏳ Next scan in 15 seconds...');
    await new Promise(r => setTimeout(r, 15000)); // Faster scanning
  }
}

// Manual test buy
async function testBuy() {
  const wallet = Keypair.fromSecretKey(new Uint8Array(WALLET_ARRAY));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const testToken = process.env.TARGET_TOKEN_MINT; // Your DutchBros token
  
  console.log('🧪 Testing buy functionality...');
  console.log(`Token: ${testToken}`);
  
  try {
    const buyRes = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: wallet.publicKey.toString(),
        action: 'buy',
        mint: testToken,
        amount: 10000000, // 0.01 SOL
        denominatedInSol: 'true',
        slippage: 15,
        priorityFee: 0.0005,
        pool: 'pump'
      })
    });
    
    if (buyRes.ok) {
      const tx = VersionedTransaction.deserialize(new Uint8Array(await buyRes.arrayBuffer()));
      tx.sign([wallet]);
      const sig = await connection.sendTransaction(tx, { skipPreflight: true });
      console.log(`✅ Test successful! TX: ${sig}`);
    } else {
      console.log('❌ Test failed:', await buyRes.text());
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Check args
const args = process.argv.slice(2);
if (args[0] === 'test') {
  testBuy().catch(console.error);
} else {
  console.log('🚀 Starting improved sniper...\n');
  runSniper().catch(console.error);
}