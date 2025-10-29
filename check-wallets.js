const fs = require('fs');
const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');

async function checkWallets() {
  console.log('🔍 Checking HootBot Wallet Status\n');
  
  const connection = new Connection('https://api.mainnet-beta.solana.com');
  
  // Check main wallet
  const mainSecret = JSON.parse(fs.readFileSync('wallet.json'));
  const mainKeypair = Keypair.fromSecretKey(new Uint8Array(mainSecret));
  const mainBalance = await connection.getBalance(mainKeypair.publicKey);
  
  console.log('Main Wallet:');
  console.log(`  Address: ${mainKeypair.publicKey.toBase58()}`);
  console.log(`  Balance: ${(mainBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL\n`);
  
  // Check first 5 pool wallets
  console.log('Wallet Pool (first 5):');
  for (let i = 1; i <= 5; i++) {
    try {
      const secret = JSON.parse(fs.readFileSync(`walletPool/wallet${i}.json`));
      const keypair = Keypair.fromSecretKey(new Uint8Array(secret));
      const balance = await connection.getBalance(keypair.publicKey);
      
      console.log(`  Wallet ${i}: ${keypair.publicKey.toBase58().substring(0, 8)}... | ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    } catch (e) {
      console.log(`  Wallet ${i}: Error`);
    }
  }
  
  console.log('\n💡 To fund wallets, send 0.01-0.05 SOL to each address');
}

checkWallets().catch(console.error);
