// HootBot/src/walletUtils.ts

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';
dotenv.config();

// Cache for loaded wallets
const walletCache: Keypair[] = [];
let walletsLoaded = false;

/**
 * Load all wallet keypairs from environment variables
 */
function loadWallets(): void {
  if (walletsLoaded) return;
  
  // For volume churning, we primarily use Fish and Dolphin wallets
  // Fish wallet for high-frequency churning
  const fishWallet1 = process.env.FISH_WALLET_1;
  if (fishWallet1) {
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(fishWallet1));
      walletCache.push(keypair);
      console.log('🐟 Loaded Fish wallet for churning');
    } catch (error) {
      console.error('Failed to load FISH_WALLET_1:', error);
    }
  }
  
  // Dolphin wallets for distribution & churning
  const dolphinWallet1 = process.env.DOLPHIN_WALLET_1;
  if (dolphinWallet1) {
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(dolphinWallet1));
      walletCache.push(keypair);
      console.log('🐬 Loaded Dolphin wallet 1');
    } catch (error) {
      console.error('Failed to load DOLPHIN_WALLET_1:', error);
    }
  }
  
  const dolphinWallet2 = process.env.DOLPHIN_WALLET_2;
  if (dolphinWallet2) {
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(dolphinWallet2));
      walletCache.push(keypair);
      console.log('🐬 Loaded Dolphin wallet 2');
    } catch (error) {
      console.error('Failed to load DOLPHIN_WALLET_2:', error);
    }
  }
  
  // Note: Whale wallets are reserved for profit-taking in the distribution bot
  // Not used for volume churning
  
  walletsLoaded = true;
  console.log(`✅ Loaded ${walletCache.length} wallets for volume churning`);
}

/**
 * Get a random keypair from the loaded wallets
 */
export function getRandomKeypair(): Keypair {
  loadWallets();
  
  if (walletCache.length === 0) {
    throw new Error('No wallets loaded! Please add wallet keys to your .env file');
  }
  
  const randomIndex = Math.floor(Math.random() * walletCache.length);
  return walletCache[randomIndex];
}

/**
 * Get a specific wallet by index
 */
export function getWalletByIndex(index: number): Keypair | null {
  loadWallets();
  
  if (index < 0 || index >= walletCache.length) {
    return null;
  }
  
  return walletCache[index];
}

/**
 * Get all loaded wallets
 */
export function getAllWallets(): Keypair[] {
  loadWallets();
  return [...walletCache]; // Return copy to prevent external modification
}

/**
 * Get the count of loaded wallets
 */
export function getWalletCount(): number {
  loadWallets();
  return walletCache.length;
}

/**
 * Validate a wallet secret key string
 */
export function validateWalletKey(secretKey: string): boolean {
  try {
    const decoded = bs58.decode(secretKey);
    if (decoded.length !== 64) return false;
    
    // Try to create keypair to fully validate
    Keypair.fromSecretKey(decoded);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a new random keypair (for testing)
 */
export function generateNewKeypair(): Keypair {
  return Keypair.generate();
}

/**
 * Get wallet balance checker utility
 */
export async function checkWalletBalance(
  connection: any, 
  wallet: Keypair
): Promise<number> {
  try {
    const balance = await connection.getBalance(wallet.publicKey);
    return balance / 1e9; // Convert lamports to SOL
  } catch (error) {
    console.error(`Failed to check balance for ${wallet.publicKey.toString()}:`, error);
    return 0;
  }
}