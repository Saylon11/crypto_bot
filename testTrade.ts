import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadMainWallet } from './src/utils/walletLoader';
import dotenv from 'dotenv';

dotenv.config();

async function testTrade() {
  const wallet = loadMainWallet();
  const connection = new Connection(
    `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    'confirmed'
  );
  
  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Wallet: ${wallet.publicKey.toString()}`);
  console.log(`Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  
  if (balance < 0.01 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Insufficient balance for test trade');
    return;
  }
  
  console.log('✅ Ready to trade!');
  console.log(`Token: ${process.env.FATBEAR_TOKEN_MINT}`);
}

testTrade().catch(console.error);
