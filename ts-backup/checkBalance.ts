// HootBot/src/pumpTools/checkBalance.ts
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';

dotenv.config();

// Get wallet function (same as in your raid files)
function getWallet(): Keypair {
  // First try to load from keypair path
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (keypairPath) {
    try {
      console.log(`Loading wallet from: ${keypairPath}`);
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
      return wallet;
    } catch (error) {
      console.error('Error loading keypair file:', error);
    }
  }
  
  // Fallback to WALLET_SECRET_KEY
  const secretKey = process.env.WALLET_SECRET_KEY;
  if (!secretKey) {
    throw new Error('No wallet configured! Set HOOTBOT_KEYPAIR_PATH or WALLET_SECRET_KEY');
  }
  
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

// Get connection with better error handling
function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  
  // Skip Helius if key is invalid or default
  if (heliusKey && heliusKey !== 'your_key' && heliusKey !== '' && !heliusKey.includes('your_')) {
    console.log('Attempting Helius RPC...');
    // We'll handle Helius errors in the main function
    return new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
      'confirmed'
    );
  } else {
    console.log('Using public RPC...');
    return new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }
}

async function checkBalance(): Promise<void> {
  console.log('\n🦉 HootBot Wallet Balance Check');
  console.log('================================\n');
  
  try {
    const wallet = getWallet();
    let connection = getConnection();
    
    console.log(`📍 Wallet Address: ${wallet.publicKey.toString()}`);
    console.log('\nChecking balance...\n');
    
    let balance: number;
    try {
      balance = await connection.getBalance(wallet.publicKey);
    } catch (error: any) {
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        console.log('⚠️  Helius API key unauthorized, switching to public RPC...');
        connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
        balance = await connection.getBalance(wallet.publicKey);
      } else {
        throw error;
      }
    }
    
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`💰 Current Balance: ${solBalance.toFixed(4)} SOL`);
    console.log(`💵 USD Value: ~$${(solBalance * 245).toFixed(2)} (at $245/SOL)`);
    
    // Raid readiness check
    console.log('\n📊 Raid Readiness:');
    console.log('─────────────────');
    
    if (solBalance >= 10.5) {
      console.log('✅ Sufficient balance for 10 SOL bonding raid');
      console.log(`   Available after raid: ${(solBalance - 10).toFixed(4)} SOL`);
    } else if (solBalance >= 10) {
      console.log('⚠️  Exact balance for 10 SOL raid (no buffer)');
    } else {
      console.log(`❌ Insufficient balance for 10 SOL raid`);
      console.log(`   Need: ${(10 - solBalance).toFixed(4)} more SOL`);
    }
    
    // Show what raids are possible
    console.log('\n🎯 Available Raid Options:');
    if (solBalance >= 10) {
      console.log('   ✓ Full Bonding Raid (10 SOL)');
    }
    if (solBalance >= 3.2) {
      console.log('   ✓ Whale FOMO Raid (3.2 SOL)');
    }
    if (solBalance >= 2.75) {
      console.log('   ✓ Momentum Surge (2.75 SOL)');
    }
    if (solBalance >= 0.5) {
      console.log('   ✓ Stealth Accumulation (0.5 SOL)');
    }
    if (solBalance < 0.5) {
      console.log('   ❌ Balance too low for any raid options');
    }
    
    // Transaction fees reminder
    console.log('\n💡 Note: Keep ~0.05 SOL for transaction fees');
    
  } catch (error) {
    console.error('\n❌ Error checking balance:', error);
    if (error instanceof Error) {
      console.error('Details:', error.message);
    }
  }
}

// Direct execution
if (require.main === module) {
  checkBalance()
    .then(() => {
      console.log('\n✅ Balance check complete!\n');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}