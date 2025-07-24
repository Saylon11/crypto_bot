// jupiterTrade.js - Trade graduated tokens on Raydium/Jupiter
const { Connection, Keypair, VersionedTransaction, PublicKey } = require('@solana/web3.js');
const fetch = require('node-fetch');
const fs = require('fs');
require('dotenv').config();

async function tradeOnJupiter(amountSol = 0.001) {
  console.log(`\n🪐 Trading ${amountSol} SOL for OILCOIN via Jupiter...\n`);
  
  // Load wallet
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  console.log(`💳 Wallet: ${wallet.publicKey.toString()}`);
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`💰 Balance: ${(balance / 1e9).toFixed(4)} SOL`);
  
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  const OILCOIN_MINT = 'Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump';
  
  try {
    // Get quote from Jupiter
    console.log('\n📊 Getting quote from Jupiter...');
    const quoteResponse = await fetch(`https://quote-api.jup.ag/v6/quote?inputMint=${SOL_MINT}&outputMint=${OILCOIN_MINT}&amount=${Math.floor(amountSol * 1e9)}&slippageBps=300`);
    
    if (!quoteResponse.ok) {
      const error = await quoteResponse.text();
      console.error('Quote error:', error);
      return;
    }
    
    const quoteData = await quoteResponse.json();
    console.log(`✅ Quote received:`);
    console.log(`   Input: ${amountSol} SOL`);
    console.log(`   Expected output: ${(quoteData.outAmount / 1e9).toFixed(2)} OILCOIN`);
    console.log(`   Price impact: ${quoteData.priceImpactPct}%`);
    
    // Get swap transaction
    console.log('\n🔄 Getting swap transaction...');
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        computeUnitPriceMicroLamports: 20000 // Priority fee
      })
    });
    
    if (!swapResponse.ok) {
      const error = await swapResponse.text();
      console.error('Swap error:', error);
      return;
    }
    
    const swapData = await swapResponse.json();
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    
    // Sign transaction
    console.log('✍️ Signing transaction...');
    transaction.sign([wallet]);
    
    // Send transaction
    console.log('📡 Sending transaction...');
    const rawTransaction = transaction.serialize();
    const signature = await connection.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 2
    });
    
    console.log(`\n✅ Transaction sent!`);
    console.log(`🔗 Signature: ${signature}`);
    console.log(`🌐 View on Solscan: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    const latestBlockhash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    console.log('✅ Transaction confirmed!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test with small amount
tradeOnJupiter(0.001).catch(console.error);