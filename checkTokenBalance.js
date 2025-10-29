// checkTokenBalance.js - Find where your FATBEAR tokens are
const { Connection, PublicKey, Keypair } = require('@solana/web3.js');
const { getAssociatedTokenAddress, getAccount } = require('@solana/spl-token');
const bs58 = require('bs58');
require('dotenv').config();

const WHALE_WALLET_KEY = 'y31AJw6fGDVdwLwC9gGaQWR2f1f1G7JihvdR7gqgHjQ6cz7uNCkq2VRMdrkfVoZKFG5be3y4yZ1AXkAnQhwSLRh';
const FATBEAR_MINT = new PublicKey('Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump');

async function checkBalance() {
  console.log('🔍 Checking FATBEAR Token Balance');
  console.log('=' . repeat(50));
  
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  const wallet = Keypair.fromSecretKey(bs58.decode(WHALE_WALLET_KEY));
  
  console.log(`📍 Wallet: ${wallet.publicKey.toBase58()}`);
  console.log(`🪙  Token: ${FATBEAR_MINT.toBase58()}`);
  
  try {
    // Get Associated Token Account address
    const ata = await getAssociatedTokenAddress(FATBEAR_MINT, wallet.publicKey);
    console.log(`\n📬 Associated Token Account: ${ata.toBase58()}`);
    
    // Try to get the account info
    try {
      const tokenAccount = await getAccount(connection, ata);
      const balance = Number(tokenAccount.amount) / 1_000_000; // Assuming 6 decimals
      console.log(`✅ Token Balance: ${balance.toLocaleString()} FATBEAR`);
      
      if (balance === 0) {
        console.log('\n⚠️  WARNING: Token account exists but balance is 0!');
        console.log('The tokens may have already been moved.');
      }
    } catch (error) {
      console.log('❌ Token account does not exist!');
      console.log('\nPossible reasons:');
      console.log('1. Tokens are in a different wallet');
      console.log('2. Wrong token mint address');
      console.log('3. Tokens were already transferred');
      
      // Let's check if this wallet has ANY token accounts
      console.log('\n🔍 Checking for any token accounts...');
      const response = await connection.getParsedTokenAccountsByOwner(
        wallet.publicKey,
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );
      
      if (response.value.length === 0) {
        console.log('❌ No token accounts found for this wallet!');
      } else {
        console.log(`Found ${response.value.length} token account(s):`);
        response.value.forEach((account, i) => {
          const mint = account.account.data.parsed.info.mint;
          const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
          console.log(`  ${i + 1}. Mint: ${mint}`);
          console.log(`     Balance: ${balance}`);
        });
      }
    }
    
    // Also check SOL balance
    const solBalance = await connection.getBalance(wallet.publicKey);
    console.log(`\n💰 SOL Balance: ${(solBalance / 1e9).toFixed(4)} SOL`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkBalance().catch(console.error);