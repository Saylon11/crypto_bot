// HootBot/setupWalletFiles.ts
// Run this from HootBot root: npx ts-node setupWalletFiles.ts

import fs from 'fs';
import path from 'path';

const walletLoaderContent = `// HootBot/src/utils/walletLoader.ts
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export interface LoadedWallet {
  keypair: Keypair;
  publicKey: string;
  type: 'whale' | 'dolphin' | 'fish' | 'main';
  envKey: string;
}

/**
 * Attempts to load a wallet from various formats
 */
function loadWalletFromString(walletString: string, envKey: string): Keypair | null {
  if (!walletString || walletString === 'NEEDS_CONVERSION') {
    return null;
  }

  try {
    // Try 1: Base58 format (most common)
    if (!walletString.includes(',') && !walletString.includes('[')) {
      const decoded = bs58.decode(walletString);
      if (decoded.length === 64) {
        return Keypair.fromSecretKey(decoded);
      }
    }

    // Try 2: The format from your .env appears to already be base58
    // Let's validate it
    try {
      const decoded = bs58.decode(walletString);
      if (decoded.length === 64) {
        return Keypair.fromSecretKey(decoded);
      }
    } catch (e) {
      // Not valid base58
    }

  } catch (error: any) {
    console.error(\`Failed to parse \${envKey}:\`, error.message);
  }

  return null;
}

/**
 * Load the main HootBot wallet
 */
export function loadMainWallet(): Keypair {
  // First try keypair file
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (keypairPath && fs.existsSync(keypairPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const keypair = Keypair.fromSecretKey(new Uint8Array(data));
      console.log(\`✅ Main wallet loaded from file: \${keypair.publicKey.toString()}\`);
      return keypair;
    } catch (error) {
      console.warn('Failed to load from keypair file, trying WALLET_SECRET_KEY');
    }
  }

  throw new Error('No main wallet configured! Set HOOTBOT_KEYPAIR_PATH');
}

/**
 * Load all distribution wallets
 */
export function loadDistributionWallets(): LoadedWallet[] {
  const wallets: LoadedWallet[] = [];
  
  // Define wallet configurations
  const walletConfigs = [
    { envKey: 'WHALE_WALLET_1', type: 'whale' as const },
    { envKey: 'WHALE_WALLET_2', type: 'whale' as const },
    { envKey: 'DOLPHIN_WALLET_1', type: 'dolphin' as const },
    { envKey: 'DOLPHIN_WALLET_2', type: 'dolphin' as const },
    { envKey: 'FISH_WALLET_1', type: 'fish' as const }
  ];

  for (const config of walletConfigs) {
    const walletString = process.env[config.envKey];
    if (!walletString) {
      console.warn(\`⚠️  \${config.envKey} not found in .env\`);
      continue;
    }

    const keypair = loadWalletFromString(walletString, config.envKey);
    if (keypair) {
      wallets.push({
        keypair,
        publicKey: keypair.publicKey.toString(),
        type: config.type,
        envKey: config.envKey
      });
      console.log(\`✅ Loaded \${config.type} wallet: \${keypair.publicKey.toString().slice(0, 8)}...\`);
    } else {
      console.error(\`❌ Failed to load \${config.envKey}\`);
    }
  }

  return wallets;
}

/**
 * Validate all wallets are properly configured
 */
export function validateWalletConfiguration(): boolean {
  console.log('\\n🔍 Validating wallet configuration...\\n');
  
  let isValid = true;

  // Check main wallet
  try {
    const mainWallet = loadMainWallet();
    console.log(\`✅ Main wallet: \${mainWallet.publicKey.toString()}\`);
  } catch (error) {
    console.error('❌ Main wallet not configured properly');
    isValid = false;
  }

  // Check distribution wallets
  const distributionWallets = loadDistributionWallets();
  if (distributionWallets.length === 0) {
    console.error('❌ No distribution wallets loaded');
    isValid = false;
  } else {
    console.log(\`✅ Loaded \${distributionWallets.length} distribution wallets\`);
  }

  return isValid;
}

// Export for backward compatibility
export const loadWallet = loadMainWallet;
export const loadWallets = loadDistributionWallets;

/**
 * Convert wallet keys - but your keys already look like base58
 */
export function convertWalletKeys(): void {
  console.log('\\n🔄 Checking wallet keys...\\n');
  
  const walletKeys = [
    'WHALE_WALLET_1',
    'WHALE_WALLET_2',
    'DOLPHIN_WALLET_1',
    'DOLPHIN_WALLET_2',
    'FISH_WALLET_1'
  ];

  console.log('Your wallet configuration in .env:\\n');

  for (const envKey of walletKeys) {
    const walletString = process.env[envKey];
    if (!walletString) {
      console.log(\`\${envKey}=NOT_CONFIGURED\`);
      continue;
    }

    // Your wallet strings look like they're already base58
    console.log(\`\${envKey}=\${walletString.slice(0, 20)}... (looks like base58)\`);
  }
}
`;

const fixWalletsContent = `// HootBot/src/utils/fixWallets.ts
import { convertWalletKeys, validateWalletConfiguration } from './walletLoader';
import dotenv from 'dotenv';

dotenv.config();

console.log('🦉 HootBot Wallet Configuration Tool\\n');

// First, try to convert any wallet keys that need it
convertWalletKeys();

console.log('\\n' + '═'.repeat(60) + '\\n');

// Then validate the configuration
const isValid = validateWalletConfiguration();

if (isValid) {
  console.log('\\n✅ Wallet configuration is valid and ready to use!');
} else {
  console.log('\\n❌ Wallet configuration needs attention.');
}

// Also check if we're looking at the right wallet.json file
console.log('\\n📁 Checking wallet.json file...');
const walletJsonPath = process.env.HOOTBOT_KEYPAIR_PATH;
if (walletJsonPath) {
  console.log(\`   Path: \${walletJsonPath}\`);
  try {
    const fs = require('fs');
    if (fs.existsSync(walletJsonPath)) {
      const data = JSON.parse(fs.readFileSync(walletJsonPath, 'utf-8'));
      console.log(\`   ✅ File exists with \${data.length} bytes\`);
    } else {
      console.log('   ❌ File not found at specified path');
    }
  } catch (error: any) {
    console.log(\`   ❌ Error reading file: \${error.message}\`);
  }
}
`;

const diagnoseRaydiumContent = `// HootBot/src/utils/diagnoseRaydium.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

async function diagnoseRaydiumConnection() {
  console.log('🏥 Running Raydium/Jupiter Diagnostic...\\n');

  // 1. Test RPC Connection
  console.log('1️⃣ Testing RPC Connection...');
  const heliusKey = process.env.HELIUS_API_KEY;
  const rpcUrl = heliusKey 
    ? \`https://mainnet.helius-rpc.com/?api-key=\${heliusKey}\`
    : 'https://api.mainnet-beta.solana.com';
  
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const slot = await connection.getSlot();
    console.log(\`✅ RPC Connected - Current slot: \${slot}\`);
    console.log(\`   Using: \${heliusKey ? 'Helius' : 'Public'} RPC\\n\`);
  } catch (error: any) {
    console.error('❌ RPC Connection failed:', error.message);
    return;
  }

  // 2. Test Token Configuration
  console.log('2️⃣ Testing Token Configuration...');
  const tokenMint = process.env.FATBEAR_TOKEN_MINT || process.env.PRIMARY_TOKEN_MINT;
  if (!tokenMint) {
    console.error('❌ FATBEAR_TOKEN_MINT not found in .env');
    return;
  }
  console.log(\`✅ Token mint: \${tokenMint}\\n\`);

  // 3. Test Jupiter API
  console.log('3️⃣ Testing Jupiter API...');
  const SOL_MINT = 'So11111111111111111111111111111111111111112';
  
  try {
    // Test getting a quote
    const quoteUrl = \`https://quote-api.jup.ag/v6/quote?\` +
      \`inputMint=\${SOL_MINT}&\` +
      \`outputMint=\${tokenMint}&\` +
      \`amount=\${0.001 * LAMPORTS_PER_SOL}&\` +
      \`slippageBps=50\`;
    
    console.log(\`   Fetching quote for 0.001 SOL -> \${tokenMint.slice(0, 8)}...\`);
    const response = await fetch(quoteUrl);
    
    if (response.ok) {
      const quote = await response.json();
      console.log(\`✅ Jupiter API working!\`);
      console.log(\`   Routes found: \${quote.routePlan?.length || 0}\`);
      console.log(\`   Price impact: \${quote.priceImpactPct}%\`);
      
      if (!quote.routePlan || quote.routePlan.length === 0) {
        console.error(\`\\n⚠️  WARNING: Token may not have sufficient liquidity on Raydium\`);
      }
    } else {
      const error = await response.text();
      console.error(\`❌ Jupiter API error: \${error}\`);
    }
  } catch (error: any) {
    console.error('❌ Jupiter API request failed:', error.message);
  }

  console.log('\\n✅ Diagnostic complete!');
}

// Run diagnostic
diagnoseRaydiumConnection().catch(console.error);
`;

// Create the files
console.log('📁 Creating wallet utility files...\n');

// Create walletLoader.ts
const walletLoaderPath = path.join('src', 'utils', 'walletLoader.ts');
fs.writeFileSync(walletLoaderPath, walletLoaderContent);
console.log(`✅ Created ${walletLoaderPath}`);

// Create fixWallets.ts
const fixWalletsPath = path.join('src', 'utils', 'fixWallets.ts');
fs.writeFileSync(fixWalletsPath, fixWalletsContent);
console.log(`✅ Created ${fixWalletsPath}`);

// Create diagnoseRaydium.ts
const diagnosePath = path.join('src', 'utils', 'diagnoseRaydium.ts');
fs.writeFileSync(diagnosePath, diagnoseRaydiumContent);
console.log(`✅ Created ${diagnosePath}`);

console.log('\n✅ All files created successfully!');
console.log('\nNext steps:');
console.log('1. Install dependencies: npm install node-fetch@2 @types/node-fetch');
console.log('2. Run wallet check: npx ts-node src/utils/fixWallets.ts');
console.log('3. Run diagnostic: npx ts-node src/utils/diagnoseRaydium.ts');