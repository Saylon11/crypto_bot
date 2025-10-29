// HootBot/src/utils/walletLoader.ts
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
    console.error(`Failed to parse ${envKey}:`, error.message);
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
      console.log(`✅ Main wallet loaded from file: ${keypair.publicKey.toString()}`);
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
      console.warn(`⚠️  ${config.envKey} not found in .env`);
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
      console.log(`✅ Loaded ${config.type} wallet: ${keypair.publicKey.toString().slice(0, 8)}...`);
    } else {
      console.error(`❌ Failed to load ${config.envKey}`);
    }
  }

  return wallets;
}

/**
 * Validate all wallets are properly configured
 */
export function validateWalletConfiguration(): boolean {
  console.log('\n🔍 Validating wallet configuration...\n');
  
  let isValid = true;

  // Check main wallet
  try {
    const mainWallet = loadMainWallet();
    console.log(`✅ Main wallet: ${mainWallet.publicKey.toString()}`);
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
    console.log(`✅ Loaded ${distributionWallets.length} distribution wallets`);
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
  console.log('\n🔄 Checking wallet keys...\n');
  
  const walletKeys = [
    'WHALE_WALLET_1',
    'WHALE_WALLET_2',
    'DOLPHIN_WALLET_1',
    'DOLPHIN_WALLET_2',
    'FISH_WALLET_1'
  ];

  console.log('Your wallet configuration in .env:\n');

  for (const envKey of walletKeys) {
    const walletString = process.env[envKey];
    if (!walletString) {
      console.log(`${envKey}=NOT_CONFIGURED`);
      continue;
    }

    // Your wallet strings look like they're already base58
    console.log(`${envKey}=${walletString.slice(0, 20)}... (looks like base58)`);
  }
}
