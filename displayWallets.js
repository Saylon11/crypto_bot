// displayWallets.js - Display Phase 1 wallets for Solflare import
const fs = require('fs');

try {
  // Read the phase 1 wallet data
  const data = JSON.parse(fs.readFileSync('phase1-latest.json', 'utf-8'));
  
  console.log('🔐 PHASE 1 WALLETS - FATBEAR Distribution');
  console.log('=' . repeat(70));
  console.log('IMPORTANT: Keep these private keys secure!\n');
  
  data.wallets.forEach((wallet, index) => {
    console.log(`Wallet ${index + 1}: ${wallet.label} (${wallet.personality})`);
    console.log(`Address: ${wallet.address}`);
    console.log(`Private Key: ${wallet.privateKey}`);
    console.log(`Tokens: ${(wallet.actualAmount || wallet.amount).toLocaleString()} FATBEAR`);
    console.log('-' . repeat(70));
  });
  
  console.log('\nTO IMPORT INTO SOLFLARE:');
  console.log('1. Open Solflare wallet');
  console.log('2. Click "+" to add new wallet');
  console.log('3. Select "Import Private Key"');
  console.log('4. Paste the private key above');
  console.log('5. Name it with the label (e.g., "FATBEAR - DeFi Veteran")');
  
  console.log('\n⚠️  SECURITY REMINDER:');
  console.log('- Save these keys in a password manager');
  console.log('- Never share these private keys');
  console.log('- Consider using a hardware wallet for long-term storage');
  
} catch (error) {
  console.error('Error reading phase1-latest.json:', error.message);
  console.log('\nMake sure you have completed Phase 1 first!');
}