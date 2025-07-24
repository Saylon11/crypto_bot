cat > quickTest.js << 'EOF'
const { Connection, Keypair, VersionedTransaction } = require('@solana/web3.js');
const fetch = require('node-fetch');
require('dotenv').config();

async function quickTest() {
  const fs = require('fs');
  const keypairData = JSON.parse(fs.readFileSync(process.env.HOOTBOT_KEYPAIR_PATH, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log('Testing 0.001 SOL buy...');
  
  const response = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: wallet.publicKey.toString(),
      action: 'buy',
      mint: 'BKjx5R9AuxXMUVM2hSxu1CkPSSdBCzJraMzEc8WZ7tvh',
      amount: 1000000, // 0.001 SOL
      denominatedInSol: 'true',
      slippage: 25, // Higher slippage for low liquidity
      priorityFee: 0.0005,
      pool: 'pump'
    })
  });
  
  if (!response.ok) {
    console.error('API Error:', await response.text());
    return;
  }
  
  const tx = VersionedTransaction.deserialize(Buffer.from(await response.arrayBuffer()));
  tx.sign([wallet]);
  
  const sig = await connection.sendTransaction(tx, { skipPreflight: true });
  console.log('TX:', sig);
  console.log('View: https://solscan.io/tx/' + sig);
}

quickTest().catch(console.error);
EOF

# Verify the file is in the root
ls quickTest.js

# Run it
node quickTest.js