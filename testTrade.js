// testTrade.js - Place this in HootBot root directory
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fetch = require('node-fetch');

// Load environment variables
require('dotenv').config();

async function testPumpFunTrade() {
  console.log('\n🧪 Testing Pump.fun Trading...\n');
  
  // Configuration
  const tokenMint = 'BKjx5R9AuxXMUVM2hSxu1CkPSSdBCzJraMzEc8WZ7tvh';
  const amountSol = 0.01;
  
  // Use public RPC for testing
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  console.log('✅ Using public RPC');
  
  // Load wallet
  const fs = require('fs');
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  let wallet;
  
  if (keypairPath && fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
    console.log('✅ Wallet loaded from file');
  } else {
    const secretKey = process.env.WALLET_SECRET_KEY;
    wallet = Keypair.fromSecretKey(bs58.decode(secretKey));
    console.log('✅ Wallet loaded from base58');
  }
  
  console.log(`📍 Wallet address: ${wallet.publicKey.toString()}`);
  
  // Check balance
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    console.log(`💰 Balance: ${(balance / 1e9).toFixed(4)} SOL`);
    
    if (balance < 0.015 * 1e9) {
      console.error('❌ Insufficient balance! Need at least 0.015 SOL');
      return;
    }
  } catch (error) {
    console.error('❌ Failed to check balance:', error.message);
    return;
  }
  
  // Prepare Pump.fun API request
  const requestBody = {
    publicKey: wallet.publicKey.toString(),
    action: 'buy',
    mint: tokenMint,
    amount: Math.floor(amountSol * 1e9), // Convert to lamports
    denominatedInSol: 'true',
    slippage: 10,
    priorityFee: 0.0005,
    pool: 'pump'
  };
  
  console.log('\n📤 Calling Pump.fun API...');
  console.log('Request:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`\n📥 Response status: ${response.status}`);
    console.log(`Headers:`, response.headers.raw());
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', errorText);
      
      // Common error explanations
      if (errorText.includes('Insufficient')) {
        console.log('\n💡 Hint: You might not have enough SOL for fees + slippage');
      } else if (errorText.includes('Invalid mint')) {
        console.log('\n💡 Hint: The token might not exist on Pump.fun');
      }
      return;
    }
    
    // Get transaction data
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    let transactionData;
    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();
      console.log('\n📋 JSON Response:', JSON.stringify(jsonData, null, 2));
      
      if (jsonData.error) {
        console.error('❌ API returned error:', jsonData.error);
        return;
      }
      
      transactionData = Buffer.from(jsonData.transaction || jsonData, 'base64');
    } else {
      transactionData = Buffer.from(await response.arrayBuffer());
    }
    
    console.log(`\n📦 Received ${transactionData.length} bytes of transaction data`);
    
    // Import VersionedTransaction
    const { VersionedTransaction } = require('@solana/web3.js');
    
    // Deserialize and sign transaction
    const tx = VersionedTransaction.deserialize(transactionData);
    console.log('✅ Transaction deserialized successfully');
    
    tx.sign([wallet]);
    console.log('✅ Transaction signed');
    
    // Send transaction
    console.log('\n📡 Sending transaction...');
    const signature = await connection.sendTransaction(tx, {
      skipPreflight: false,
      maxRetries: 3
    });
    
    console.log(`\n✅ Transaction sent!`);
    console.log(`🔗 Signature: ${signature}`);
    console.log(`🌐 View on Solscan: https://solscan.io/tx/${signature}`);
    
    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    const latestBlockhash = await connection.getLatestBlockhash();
    const confirmation = await connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    if (confirmation.value.err) {
      console.error('❌ Transaction failed:', confirmation.value.err);
    } else {
      console.log('✅ Transaction confirmed!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testPumpFunTrade().catch(console.error);