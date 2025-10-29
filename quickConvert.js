// quickConvert.js - Convert wallet.json to base58
const fs = require('fs');
const bs58 = require('bs58');

try {
  // Read the wallet.json file
  const keypairData = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
  
  // Convert to base58
  const base58Key = bs58.encode(Buffer.from(keypairData));
  
  console.log('\n🔑 Your Base58 Private Key:');
  console.log(base58Key);
  
  console.log('\n📋 Copy this line into your .env file:');
  console.log(`WALLET_SECRET_KEY=${base58Key}`);
  
  // Also show public key
  const { Keypair } = require('@solana/web3.js');
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  console.log(`HOOTBOT_WALLET_ADDRESS=${keypair.publicKey.toString()}`);
  
} catch (error) {
  console.error('Error:', error.message);
  console.log('\nPlease ensure wallet.json exists and is valid JSON array');
}