// instantTrade.js - Place in HootBot root and run with: node instantTrade.js
const { Connection, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const fs = require('fs');
const fetch = require('node-fetch');
require('dotenv').config();

async function instantTrade() {
  console.log('🦉 HootBot Instant Trade\n');
  
  // Load wallet
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  // Setup
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const tokenMint = process.env.TARGET_TOKEN_MINT || process.env.TARGET_TOKEN_MINT;
  const amountSol = 0.01;
  
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  console.log(`Token: ${tokenMint}`);
  console.log(`Amount: ${amountSol} SOL`);
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (balance < 0.015 * LAMPORTS_PER_SOL) {
    console.error('❌ Need at least 0.015 SOL');
    return;
  }
  
  // Execute trade
  console.log('\n📤 Calling Pump.fun API...');
  
  const response = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: wallet.publicKey.toString(),
      action: 'buy',
      mint: tokenMint,
      amount: Math.floor(amountSol * LAMPORTS_PER_SOL),
      denominatedInSol: 'true',
      slippage: 10,
      priorityFee: 0.0005,
      pool: 'pump'
    })
  });
  
  if (!response.ok) {
    console.error('❌ API Error:', await response.text());
    return;
  }
  
  // Get and sign transaction
  const txData = await response.arrayBuffer();
  const tx = VersionedTransaction.deserialize(new Uint8Array(txData));
  tx.sign([wallet]);
  
  // Send transaction
  console.log('📡 Sending transaction...');
  const signature = await connection.sendTransaction(tx, {
    skipPreflight: true,
    maxRetries: 3
  });
  
  console.log(`\n✅ Success!`);
  console.log(`TX: ${signature}`);
  console.log(`View: https://solscan.io/tx/${signature}`);
  
  // Wait for confirmation
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature,
    blockhash: latestBlockhash.blockhash,
    lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
  });
  
  console.log('✅ Confirmed!');
}

instantTrade().catch(console.error);