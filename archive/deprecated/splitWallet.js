// splitWallet.js - Quick JavaScript version
const { 
    Connection, 
    Keypair, 
    PublicKey, 
    Transaction,
    sendAndConfirmTransaction,
    SystemProgram,
    LAMPORTS_PER_SOL
  } = require('@solana/web3.js');
  const { 
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount
  } = require('@solana/spl-token');
  const fs = require('fs');
  const bs58 = require('bs58');
  require('dotenv').config();
  
  // Your whale wallet
  const WHALE_WALLET_KEY = 'y31AJw6fGDVdwLwC9gGaQWR2f1f1G7JihvdR7gqgHjQ6cz7uNCkq2VRMdrkfVoZKFG5be3y4yZ1AXkAnQhwSLRh';
  const FATBEAR_MINT = new PublicKey(process.env.TARGET_TOKEN_MINT); // Correct FATBEAR mint
  const TOTAL_TOKENS = 81_650_000;
  
  // Simple distribution for testing
  const DISTRIBUTIONS = [
    { amount: 10_000_000, label: "Large Holder 1" },
    { amount: 8_000_000, label: "Large Holder 2" },
    { amount: 6_000_000, label: "Medium Holder 1" },
    { amount: 5_000_000, label: "Medium Holder 2" },
    { amount: 4_000_000, label: "Medium Holder 3" },
    // Add more as needed
  ];
  
  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async function main() {
    console.log('🐋 FATBEAR Wallet Splitter');
    console.log('=' . repeat(50));
    
    // Load whale wallet
    let sourceWallet;
    try {
      sourceWallet = Keypair.fromSecretKey(bs58.decode(WHALE_WALLET_KEY));
      console.log(`✅ Whale wallet: ${sourceWallet.publicKey.toBase58()}`);
      
      // Verify it matches expected address
      const expectedAddress = '45HUxLPwQf9wt5ng21sVZqBx9UUHcUCkswX3Wd7Foxfd';
      if (sourceWallet.publicKey.toBase58() !== expectedAddress) {
        console.error(`❌ Wallet mismatch! Got ${sourceWallet.publicKey.toBase58()}, expected ${expectedAddress}`);
        return;
      }
    } catch (error) {
      console.error('❌ Failed to load wallet:', error.message);
      return;
    }
    
    // Connection - use public RPC for reliability
    console.log('🌐 Connecting to Solana...');
    const connection = new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    
    // Alternative: If you want to use Helius, uncomment this:
    // const connection = new Connection(
    //   `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    //   'confirmed'
    // );
    
    // Check balance
    const balance = await connection.getBalance(sourceWallet.publicKey);
    console.log(`💰 SOL Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.error('❌ Need at least 0.1 SOL for fees!');
      return;
    }
    
    // Check if this is a dry run
    const isDryRun = process.argv.includes('--dry-run');
    
    console.log(`\n📋 Distribution Plan (${isDryRun ? 'DRY RUN' : 'LIVE'}):`);
    
    const wallets = [];
    for (const dist of DISTRIBUTIONS) {
      const newWallet = Keypair.generate();
      wallets.push({
        keypair: newWallet,
        address: newWallet.publicKey.toBase58(),
        amount: dist.amount,
        label: dist.label
      });
      console.log(`   ${dist.label}: ${dist.amount.toLocaleString()} tokens → ${newWallet.publicKey.toBase58().slice(0, 8)}...`);
    }
    
    if (isDryRun) {
      console.log('\n✅ Dry run complete. No transactions sent.');
      return;
    }
    
    console.log('\n🚀 Starting transfers...');
    
    // Save wallet info BEFORE starting transfers (in case something fails)
    const walletData = wallets.map(w => ({
      address: w.address,
      privateKey: bs58.encode(w.keypair.secretKey),
      amount: w.amount,
      label: w.label
    }));
    
    // Save with timestamp for safety
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `fatbear-wallets-${timestamp}.json`;
    
    fs.writeFileSync(filename, JSON.stringify(walletData, null, 2));
    console.log(`💾 Saved wallet info to ${filename}`);
    
    // Also save a copy without timestamp for easy access
    fs.writeFileSync('fatbear-wallets-latest.json', JSON.stringify(walletData, null, 2));
    console.log('💾 Also saved to fatbear-wallets-latest.json');
    
    // Create a backup in a separate folder
    if (!fs.existsSync('./wallet-backups')) {
      fs.mkdirSync('./wallet-backups');
    }
    fs.writeFileSync(`./wallet-backups/${filename}`, JSON.stringify(walletData, null, 2));
    console.log(`💾 Backup saved to ./wallet-backups/${filename}`);
    
    // Execute transfers
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      console.log(`\n📤 Transfer ${i + 1}/${wallets.length}: ${wallet.label}`);
      
      try {
        // First fund with SOL for fees
        console.log('   Funding with SOL...');
        const fundTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: sourceWallet.publicKey,
            toPubkey: wallet.keypair.publicKey,
            lamports: 0.01 * LAMPORTS_PER_SOL,
          })
        );
        
        await sendAndConfirmTransaction(connection, fundTx, [sourceWallet]);
        console.log('   ✅ Funded with 0.01 SOL');
        
        // Wait a bit
        const delay = 15000 + Math.random() * 30000; // 15-45 seconds
        console.log(`   ⏱️  Waiting ${(delay / 1000).toFixed(1)}s...`);
        await sleep(delay);
        
        // Transfer tokens
        console.log('   Transferring tokens...');
        const sourceATA = await getAssociatedTokenAddress(FATBEAR_MINT, sourceWallet.publicKey);
        const targetATA = await getAssociatedTokenAddress(FATBEAR_MINT, wallet.keypair.publicKey);
        
        const tokenTx = new Transaction();
        
        // Create ATA if needed
        try {
          await getAccount(connection, targetATA);
        } catch {
          tokenTx.add(
            createAssociatedTokenAccountInstruction(
              sourceWallet.publicKey,
              targetATA,
              wallet.keypair.publicKey,
              FATBEAR_MINT
            )
          );
        }
        
        // Add transfer
        tokenTx.add(
          createTransferInstruction(
            sourceATA,
            targetATA,
            sourceWallet.publicKey,
            wallet.amount * 1_000_000, // 6 decimals
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        const sig = await sendAndConfirmTransaction(connection, tokenTx, [sourceWallet]);
        console.log(`   ✅ Success! TX: ${sig}`);
        
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }
    
    console.log('\n✨ Split complete!');
    console.log('\n📋 IMPORTANT - Wallet Summary:');
    console.log('Files created:');
    console.log(`  - ${filename} (timestamped backup)`);
    console.log('  - fatbear-wallets-latest.json (easy access)');
    console.log(`  - ./wallet-backups/${filename} (backup copy)`);
    
    console.log('\n🔐 To import into Solflare:');
    console.log('1. Open fatbear-wallets-latest.json');
    console.log('2. For each wallet, copy the "privateKey" value');
    console.log('3. In Solflare: Add Wallet → Import Private Key → Paste the key');
    console.log('\n⚠️  SECURITY REMINDER:');
    console.log('- Keep these files secure and backed up!');
    console.log('- Consider encrypting or moving to secure storage');
    console.log('- Never share these private keys with anyone');
  }
  
  main().catch(console.error);