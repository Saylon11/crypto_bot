// HootBot/src/core/multiWalletManager.ts

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getConnection } from '../utils/connectionUtils';
import bs58 from 'bs58';
import crypto from 'crypto';

interface WalletInfo {
  keypair: Keypair;
  publicKey: PublicKey;
  lastUsed: number;
  balance: number;
  transactionCount: number;
}

class MultiWalletManager {
  private wallets: WalletInfo[] = [];
  private currentIndex: number = 0;
  private readonly cooldownPeriod: number = 30000; // 30 seconds base cooldown
  private connection = getConnection();

  constructor() {
    this.initializeWallets();
  }

  /**
   * Initialize wallet pool with 100 wallets
   * Following the Human Realism Mandate for natural behavior
   */
  private initializeWallets(): void {
    console.log("🦉 Initializing multi-wallet pool...");
    
    // Generate 100 wallets deterministically from a seed
    const masterSeed = process.env.MASTER_WALLET_SEED || "hootbot-master-seed-2025";
    
    for (let i = 0; i < 100; i++) {
      const seed = crypto.createHash('sha256')
        .update(`${masterSeed}-${i}`)
        .digest();
      
      const keypair = Keypair.fromSeed(seed.slice(0, 32));
      
      this.wallets.push({
        keypair,
        publicKey: keypair.publicKey,
        lastUsed: 0,
        balance: 0,
        transactionCount: 0
      });
    }
    
    console.log(`✅ Initialized ${this.wallets.length} wallets`);
  }

  /**
   * Get next available wallet following natural timing patterns
   * Implements non-uniform distribution as per Human Realism Mandate
   */
  async getNextWallet(): Promise<WalletInfo> {
    const now = Date.now();
    
    // Find wallets that have cooled down
    const availableWallets = this.wallets.filter(wallet => {
      const timeSinceLastUse = now - wallet.lastUsed;
      const dynamicCooldown = this.calculateDynamicCooldown(wallet);
      return timeSinceLastUse >= dynamicCooldown;
    });

    if (availableWallets.length === 0) {
      // If no wallets available, wait for the next one to cool down
      const nextAvailable = this.wallets.reduce((closest, wallet) => {
        const walletCooldown = wallet.lastUsed + this.calculateDynamicCooldown(wallet);
        const closestCooldown = closest.lastUsed + this.calculateDynamicCooldown(closest);
        return walletCooldown < closestCooldown ? wallet : closest;
      });
      
      const waitTime = (nextAvailable.lastUsed + this.calculateDynamicCooldown(nextAvailable)) - now;
      console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s for next wallet...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.getNextWallet();
    }

    // Select wallet using weighted randomization (prefer less used wallets)
    const selectedWallet = this.selectWalletByWeight(availableWallets);
    selectedWallet.lastUsed = now;
    
    return selectedWallet;
  }

  /**
   * Calculate dynamic cooldown using exponential distribution
   * Creates natural, human-like timing patterns
   */
  private calculateDynamicCooldown(wallet: WalletInfo): number {
    // Base cooldown with exponential randomization
    const lambda = 1 / this.cooldownPeriod; // Rate parameter
    const randomDelay = -Math.log(Math.random()) / lambda;
    
    // Add usage-based multiplier (more used wallets wait longer)
    const usageMultiplier = 1 + (wallet.transactionCount * 0.1);
    
    return Math.max(randomDelay * usageMultiplier, 5000); // Minimum 5s cooldown
  }

  /**
   * Select wallet by weight (prefer less used ones)
   */
  private selectWalletByWeight(wallets: WalletInfo[]): WalletInfo {
    if (wallets.length === 1) return wallets[0];
    
    // Calculate inverse weights (less used = higher weight)
    const maxTransactions = Math.max(...wallets.map(w => w.transactionCount));
    const weights = wallets.map(w => maxTransactions - w.transactionCount + 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    
    // Select by weight
    let random = Math.random() * totalWeight;
    for (let i = 0; i < wallets.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return wallets[i];
      }
    }
    
    return wallets[0]; // Fallback
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(wallet: WalletInfo): Promise<number> {
    try {
      const balance = await this.connection.getBalance(wallet.publicKey);
      wallet.balance = balance / LAMPORTS_PER_SOL;
      return wallet.balance;
    } catch (error) {
      console.error(`❌ Error fetching balance for ${wallet.publicKey.toBase58()}:`, error);
      return 0;
    }
  }

  /**
   * Mark wallet as used (increment transaction count)
   */
  markWalletUsed(wallet: WalletInfo): void {
    wallet.transactionCount++;
    wallet.lastUsed = Date.now();
  }

  /**
   * Get wallet stats for monitoring
   */
  getWalletStats(): any {
    const totalTransactions = this.wallets.reduce((sum, w) => sum + w.transactionCount, 0);
    const activeWallets = this.wallets.filter(w => w.transactionCount > 0).length;
    
    return {
      totalWallets: this.wallets.length,
      activeWallets,
      totalTransactions,
      averageTransactionsPerWallet: totalTransactions / this.wallets.length
    };
  }

  /**
   * Emergency function to get any available wallet (bypasses cooldown)
   */
  getEmergencyWallet(): WalletInfo {
    console.log("🚨 Using emergency wallet selection");
    return this.wallets[Math.floor(Math.random() * this.wallets.length)];
  }
}

// Export singleton instance
export const walletManager = new MultiWalletManager();