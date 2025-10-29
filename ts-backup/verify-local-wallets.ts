// Local wallet verification tool
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

function verifyWallet(filePath: string): boolean {
  try {
    const walletData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check if it's an array of 64 bytes
    if (!Array.isArray(walletData) || walletData.length !== 64) {
      console.log(chalk.red(`❌ ${path.basename(filePath)}: Invalid format (expected 64-byte array)`));
      return false;
    }
    
    // Try to create keypair
    const keypair = Keypair.fromSecretKey(new Uint8Array(walletData));
    console.log(chalk.green(`✅ ${path.basename(filePath)}: ${keypair.publicKey.toBase58()}`));
    return true;
  } catch (error: any) {
    console.log(chalk.red(`❌ ${path.basename(filePath)}: ${error.message}`));
    return false;
  }
}

// Main execution
console.log(chalk.blue('🔍 Verifying Local Wallets\n'));

// Check main wallet
if (fs.existsSync('wallet.json')) {
  console.log(chalk.bold('Main Wallet:'));
  verifyWallet('wallet.json');
}

// Check wallet pool
console.log(chalk.bold('\nWallet Pool:'));
const poolDir = 'walletPool';
if (fs.existsSync(poolDir)) {
  const files = fs.readdirSync(poolDir).filter(f => f.endsWith('.json'));
  let validCount = 0;
  
  files.forEach(file => {
    if (verifyWallet(path.join(poolDir, file))) {
      validCount++;
    }
  });
  
  console.log(chalk.bold(`\nSummary: ${validCount}/${files.length} wallets valid`));
} else {
  console.log(chalk.yellow('No wallet pool directory found'));
}
