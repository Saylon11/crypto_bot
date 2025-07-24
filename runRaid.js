const { Connection, Keypair, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const fs = require('fs');

async function runRaid() {
  // Load the correct wallet
  const keypairPath = process.env.HOME + '/.hootbot/keys/hootbot-keypair.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  console.log('Using wallet:', wallet.publicKey.toString());
  
  // Check balance
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');
  
  // Now run your raid logic here
  console.log('Ready to raid with the correct wallet!');
}

runRaid().catch(console.error);
