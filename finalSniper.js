// finalSniper.js - HootBot Token Sniper with CORRECT wallet
const { Connection, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const fetch = require('node-fetch');

// YOUR CORRECT WALLET
const WALLET_ARRAY = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];

async function runSniper() {
  const wallet = Keypair.fromSecretKey(new Uint8Array(WALLET_ARRAY));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log('🦉 HootBot Token Sniper - LIVE MODE');
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  console.log('Target: New Solana tokens with momentum\n');
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (balance < 0.02 * LAMPORTS_PER_SOL) {
    console.error('❌ Need at least 0.02 SOL to start sniping');
    return;
  }
  
  console.log('✅ Ready to snipe!\n');
  
  const boughtTokens = new Set();
  let scanCount = 0;
  
  while (true) {
    try {
      scanCount++;
      console.log(`\n🔍 Scan #${scanCount} - ${new Date().toLocaleTimeString()}`);
      
      const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana');
      const data = await res.json();
      
      if (data.pairs) {
        // Find hot new tokens
        const hotTokens = data.pairs
          .filter(p => {
            const vol = parseFloat(p.volume?.h24 || 0);
            const liq = parseFloat(p.liquidity?.usd || 0);
            const ageMs = Date.now() - (p.pairCreatedAt || 0);
            const ageHours = ageMs / (1000 * 60 * 60);
            const change = parseFloat(p.priceChange?.h24 || 0);
            
            // Criteria for hot tokens
            return ageHours < 12 &&      // Less than 12 hours old
                   vol > 30000 &&         // Over $30k volume
                   liq > 10000 &&         // Over $10k liquidity  
                   change > 20 &&         // Up at least 20%
                   !boughtTokens.has(p.baseToken.address);
          })
          .sort((a, b) => parseFloat(b.volume?.h24 || 0) - parseFloat(a.volume?.h24 || 0))
          .slice(0, 5);
        
        if (hotTokens.length > 0) {
          console.log(`\n🔥 Found ${hotTokens.length} HOT tokens:`);
          
          for (const token of hotTokens) {
            const mint = token.baseToken.address;
            const symbol = token.baseToken.symbol;
            const vol = parseFloat(token.volume.h24);
            const change = parseFloat(token.priceChange?.h24 || 0);
            
            console.log(`\n🎯 ${symbol}`);
            console.log(`   Volume: $${vol.toLocaleString()}`);
            console.log(`   24h Change: +${change.toFixed(1)}%`);
            console.log(`   Liquidity: $${parseFloat(token.liquidity.usd).toLocaleString()}`);
            console.log(`   Age: ${Math.floor((Date.now() - token.pairCreatedAt) / (1000 * 60 * 60))}h`);
            console.log(`   Mint: ${mint.slice(0,8)}...`);
            
            // AUTO-BUY LOGIC
            if (vol > 50000 && change > 50) {
              console.log('\n   🚀 SUPER HOT! AUTO-BUYING...');
              
              try {
                // Try to buy on Pump.fun
                const buyRes = await fetch('https://pumpportal.fun/api/trade-local', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    publicKey: wallet.publicKey.toString(),
                    action: 'buy',
                    mint: mint,
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
                  
                  console.log('   📡 Sending transaction...');
                  const sig = await connection.sendTransaction(tx, { 
                    skipPreflight: true,
                    maxRetries: 3 
                  });
                  
                  console.log(`   ✅ BOUGHT ${symbol}!`);
                  console.log(`   TX: ${sig}`);
                  console.log(`   View: https://solscan.io/tx/${sig}`);
                  
                  boughtTokens.add(mint);
                  
                  // Wait 5 seconds before next buy
                  await new Promise(r => setTimeout(r, 5000));
                } else {
                  const error = await buyRes.text();
                  if (error.includes('graduated') || error.includes('not found')) {
                    console.log('   ℹ️  Token graduated to Raydium or not on Pump.fun');
                  } else {
                    console.log('   ❌ Buy failed:', error.slice(0, 100));
                  }
                }
              } catch (e) {
                console.log('   ❌ Error:', e.message);
              }
            } else if (vol > 30000 && change > 30) {
              console.log('   💡 Good token - consider manual buy');
            }
          }
        } else {
          console.log('No hot tokens found this scan');
        }
      }
    } catch (e) {
      console.error('Scan error:', e.message);
    }
    
    // Show stats
    if (scanCount % 10 === 0) {
      console.log(`\n📊 Stats after ${scanCount} scans:`);
      console.log(`   Tokens bought: ${boughtTokens.size}`);
      const newBalance = await connection.getBalance(wallet.publicKey);
      console.log(`   Current balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    }
    
    console.log('\n⏳ Next scan in 20 seconds...');
    await new Promise(r => setTimeout(r, 20000));
  }
}

// Add manual buy function for testing
async function manualBuy(tokenMint) {
  const wallet = Keypair.fromSecretKey(new Uint8Array(WALLET_ARRAY));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log(`\n💰 Manual buy: ${tokenMint}`);
  
  try {
    const buyRes = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: wallet.publicKey.toString(),
        action: 'buy',
        mint: tokenMint,
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
      console.log(`✅ Success! TX: ${sig}`);
    } else {
      console.log('❌ Failed:', await buyRes.text());
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}

// Start sniper
console.log('🦉 Starting HootBot Token Sniper...\n');

// Check command line args
const args = process.argv.slice(2);
if (args[0] === 'buy' && args[1]) {
  // Manual buy mode: node finalSniper.js buy TOKEN_MINT
  manualBuy(args[1]).catch(console.error);
} else {
  // Auto sniper mode
  runSniper().catch(console.error);
}