// src/devTools/createWalletPool.ts
import { Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';

const POOL_SIZE = 100;
const POOL_DIR = 'walletPool';

// Your main wallet's secret key from memory
const MAIN_WALLET_SECRET = [172,107,81,74,63,227,73,80,73,154,21,137,0,229,76,114,150,246,90,108,131,26,75,11,134,191,243,95,43,106,59,117,160,18,249,53,156,41,65,143,234,34,87,175,198,204,32,109,165,96,132,115,73,88,26,255,53,42,65,43,121,16,43,138];

async function createWalletPool() {
  console.log(chalk.blue('🦉 HootBot Wallet Pool Creator'));
  console.log(chalk.blue('==============================\n'));

  // First, verify main wallet
  try {
    const mainKeypair = Keypair.fromSecretKey(new Uint8Array(MAIN_WALLET_SECRET));
    console.log(chalk.green('✅ Main Wallet Verified:'));
    console.log(chalk.gray(`   ${mainKeypair.publicKey.toBase58()}`));
    console.log(chalk.yellow('   (This should be 3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D)\n'));
    
    // Save corrected main wallet
    fs.writeFileSync('wallet.json', JSON.stringify(MAIN_WALLET_SECRET));
    console.log(chalk.green('✅ Updated wallet.json with correct main wallet\n'));
  } catch (error) {
    console.error(chalk.red('❌ Main wallet verification failed!'));
    process.exit(1);
  }

  // Create pool directory
  if (!fs.existsSync(POOL_DIR)) {
    fs.mkdirSync(POOL_DIR, { recursive: true });
  }

  console.log(chalk.blue(`📁 Creating ${POOL_SIZE} wallets in /${POOL_DIR}...\n`));

  const walletManifest = {
    mainWallet: '3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D',
    poolSize: POOL_SIZE,
    wallets: [] as Array<{
      index: number;
      publicKey: string;
      filePath: string;
    }>
  };

  // Generate wallet pool
  for (let i = 1; i <= POOL_SIZE; i++) {
    const keypair = Keypair.generate();
    const secretKey = Array.from(keypair.secretKey);
    const publicKey = keypair.publicKey.toBase58();
    const fileName = `wallet${i}.json`;
    const filePath = path.join(POOL_DIR, fileName);
    
    // Save wallet
    fs.writeFileSync(filePath, JSON.stringify(secretKey));
    
    // Add to manifest
    walletManifest.wallets.push({
      index: i,
      publicKey,
      filePath: fileName
    });
    
    // Progress indicator
    if (i % 10 === 0) {
      console.log(chalk.green(`✅ Created ${i}/${POOL_SIZE} wallets...`));
    }
  }

  // Save manifest
  fs.writeFileSync(
    path.join(POOL_DIR, 'manifest.json'),
    JSON.stringify(walletManifest, null, 2)
  );

  console.log(chalk.green(`\n✅ Wallet pool created successfully!`));
  console.log(chalk.blue('\n📊 Summary:'));
  console.log(chalk.gray(`   Main Wallet: ${walletManifest.mainWallet}`));
  console.log(chalk.gray(`   Pool Size: ${POOL_SIZE} wallets`));
  console.log(chalk.gray(`   Location: /${POOL_DIR}/`));
  console.log(chalk.gray(`   Manifest: /${POOL_DIR}/manifest.json`));
  
  console.log(chalk.yellow('\n⚠️  Important: Fund these wallets with small amounts of SOL'));
  console.log(chalk.yellow('   Recommended: 0.01-0.05 SOL per wallet\n'));
}

// Run the creator
createWalletPool().catch(console.error);