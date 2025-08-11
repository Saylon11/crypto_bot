// scripts/verifyWallets.ts - Wallet verification tool
import { WalletManager } from '../src/core/walletManager';
import { Connection } from '@solana/web3.js';

async function verifyWallets() {
  console.log('🔍 HootBot Wallet Verifier v1.0');
  console.log('================================\n');
  
  try {
    // Initialize wallet manager
    await WalletManager.initialize();
    
    // Get list of all wallets
    const walletIds = WalletManager.listWallets();
    console.log(`📊 Found ${walletIds.length} wallets to verify\n`);
    
    // Verify all wallets
    const { valid, invalid } = await WalletManager.verifyAll();
    
    // Create connection for balance checks
    const connection = new Connection(
      process.env.HELIUS_API_KEY 
        ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
        : 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Check balances for valid wallets
    console.log('✅ Valid Wallets:');
    for (const id of valid) {
      try {
        const pubkey = await WalletManager.getPublicKey(id);
        const balance = await WalletManager.getBalance(connection, id);
        console.log(`   ${id}: ${pubkey.substring(0, 8)}...${pubkey.substring(pubkey.length - 4)}`);
        console.log(`   Balance: ${balance.toFixed(4)} SOL`);
        
        if (balance < 0.01) {
          console.log(`   ⚠️  Warning: Low balance!`);
        }
        console.log('');
      } catch (error) {
        console.log(`   ${id}: Error checking balance`);
      }
    }
    
    // Report invalid wallets
    if (invalid.length > 0) {
      console.log('\n❌ Invalid Wallets:');
      for (const id of invalid) {
        console.log(`   ${id}: Failed validation`);
      }
      
      // Exit with error code for CI/CD
      process.exit(1);
    }
    
    console.log('\n✅ All wallets verified successfully!');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
  }
}

// Run verification
verifyWallets().catch(console.error);