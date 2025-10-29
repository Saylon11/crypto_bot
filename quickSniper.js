const { Connection, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

async function runSniper() {
  // Load correct wallet
  const keypairData = JSON.parse(fs.readFileSync(process.env.HOOTBOT_KEYPAIR_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log('🦉 HootBot Sniper Active');
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);
  
  while (true) {
    try {
      const res = await fetch('https://api.dexscreener.com/latest/dex/tokens/solana');
      const data = await res.json();
      
      if (data.pairs) {
        const hot = data.pairs.filter(p => {
          const vol = parseFloat(p.volume?.h24 || 0);
          const liq = parseFloat(p.liquidity?.usd || 0);
          const age = (Date.now() - (p.pairCreatedAt || 0)) / 3600000;
          return age < 24 && vol > 30000 && liq > 10000;
        }).slice(0, 3);
        
        for (const t of hot) {
          console.log(`🎯 ${t.baseToken.symbol} - Vol: $${parseInt(t.volume.h24).toLocaleString()}`);
          
          if (parseFloat(t.volume.h24) > 50000 && parseFloat(t.priceChange?.h24 || 0) > 30) {
            console.log('🔥 HOT! Buying...');
            
            const buyRes = await fetch('https://pumpportal.fun/api/trade-local', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                publicKey: wallet.publicKey.toString(),
                action: 'buy',
                mint: t.baseToken.address,
                amount: 10000000, // 0.01 SOL
                denominatedInSol: 'true',
                slippage: 10,
                priorityFee: 0.0005,
                pool: 'pump'
              })
            });
            
            if (buyRes.ok) {
              const tx = VersionedTransaction.deserialize(new Uint8Array(await buyRes.arrayBuffer()));
              tx.sign([wallet]);
              const sig = await connection.sendTransaction(tx, { skipPreflight: true });
              console.log(`✅ TX: ${sig}\n`);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error:', e.message);
    }
    
    await new Promise(r => setTimeout(r, 30000));
  }
}

runSniper().catch(console.error);
