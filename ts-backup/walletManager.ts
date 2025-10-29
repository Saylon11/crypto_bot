// HootBot/src/executor/walletManager.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ExecutionProfile } from '../mind/mindCore';
import * as fs from 'fs';
import * as path from 'path';
import bs58 from 'bs58';
import { randomInt } from 'crypto';

interface WalletInfo {
  keypair: Keypair;
  publicKey: string;
  balance: number;
  lastUsed: number;
  totalTransactions: number;
  createdAt: number;
}

/**
 * Manages wallet pool with security and integrity checks
 */
export class WalletManager {
  private wallets: Map<string, WalletInfo> = new Map();
  private connection: Connection;
  private vaultPath: string;
  private minBalance: number = 0.01 * LAMPORTS_PER_SOL; // 0.01 SOL minimum
  
  constructor(connection: Connection, vaultPath?: string) {
    this.connection = connection;
    this.vaultPath = vaultPath || path.join(process.env.HOME || '', '.hootbot', 'vault');
  }
  
  /**
   * Initialize wallet pool from secure vault
   */
  async initialize(): Promise<void> {
    console.log('🔐 Initializing Wallet Manager...');
    
    // Load wallets from environment or vault
    await this.loadWallets();
    
    // Validate all wallets
    await this.validateAllWallets();
    
    console.log(`✅ Wallet Manager initialized with ${this.wallets.size} wallets`);
  }
  
  /**
   * Load wallets from secure sources
   */
  private async loadWallets(): Promise<void> {
    // Primary wallet from environment
    const primaryKeypair = this.loadPrimaryWallet();
    if (primaryKeypair) {
      await this.addWallet(primaryKeypair, true);
    }
    
    // Additional wallets from vault
    if (fs.existsSync(this.vaultPath)) {
      await this.loadVaultWallets();
    }
  }
  
  /**
   * Load primary wallet from environment
   */
  private loadPrimaryWallet(): Keypair | null {
    try {
      // Try keypair path first
      const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
      if (keypairPath && fs.existsSync(keypairPath)) {
        const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
        return Keypair.fromSecretKey(new Uint8Array(keypairData));
      }
      
      // Fallback to base58 secret key
      const secretKey = process.env.WALLET_SECRET_KEY;
      if (secretKey && secretKey !== '') {
        return Keypair.fromSecretKey(bs58.decode(secretKey));
      }
    } catch (error) {
      console.error('❌ Error loading primary wallet:', error);
    }
    
    return null;
  }
  
  /**
   * Load additional wallets from vault
   */
  private async loadVaultWallets(): Promise<void> {
    try {
      const files = fs.readdirSync(this.vaultPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const walletPath = path.join(this.vaultPath, file);
          const encryptedData = fs.readFileSync(walletPath, 'utf-8');
          
          // In production, decrypt the wallet data here
          // For now, assume JSON keypair format
          const keypairData = JSON.parse(encryptedData);
          const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
          
          await this.addWallet(keypair);
        }
      }
    } catch (error) {
      console.error('⚠️ Error loading vault wallets:', error);
    }
  }
  
  /**
   * Add a wallet to the pool
   */
  private async addWallet(keypair: Keypair, isPrimary: boolean = false): Promise<void> {
    const publicKey = keypair.publicKey.toString();
    
    // Check if already exists
    if (this.wallets.has(publicKey)) {
      return;
    }
    
    // Get initial balance
    const balance = await this.connection.getBalance(keypair.publicKey);
    
    this.wallets.set(publicKey, {
      keypair,
      publicKey,
      balance,
      lastUsed: isPrimary ? Date.now() : 0,
      totalTransactions: 0,
      createdAt: Date.now()
    });
    
    console.log(`💳 Added wallet: ${publicKey.slice(0, 8)}... (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);
  }
  
  /**
   * Validate all wallets for integrity and balance
   */
  private async validateAllWallets(): Promise<void> {
    console.log('🔍 Validating wallet integrity...');
    
    for (const [pubkey, walletInfo] of this.wallets.entries()) {
      try {
        // Verify keypair matches public key
        const derivedPubkey = walletInfo.keypair.publicKey.toString();
        if (derivedPubkey !== pubkey) {
          console.error(`❌ Keypair mismatch for ${pubkey}`);
          this.wallets.delete(pubkey);
          continue;
        }
        
        // Update balance
        const balance = await this.connection.getBalance(walletInfo.keypair.publicKey);
        walletInfo.balance = balance;
        
        // Check minimum balance
        if (balance < this.minBalance) {
          console.warn(`⚠️ Low balance: ${pubkey.slice(0, 8)}... (${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL)`);
        }
      } catch (error) {
        console.error(`❌ Validation failed for ${pubkey}:`, error);
        this.wallets.delete(pubkey);
      }
    }
  }
  
  /**
   * Select a wallet based on execution profile
   */
  async selectWallet(profile: ExecutionProfile): Promise<Keypair> {
    // Update balances before selection
    await this.updateBalances();
    
    // Filter wallets with sufficient balance
    const eligibleWallets = Array.from(this.wallets.values())
      .filter(w => w.balance >= this.minBalance);
    
    if (eligibleWallets.length === 0) {
      throw new Error('No wallets with sufficient balance available');
    }
    
    // Select based on profile preference
    let selectedWallet: WalletInfo;
    
    switch (profile.walletPreference) {
      case 'FRESH':
        // Select least used wallet
        selectedWallet = eligibleWallets.sort((a, b) => 
          a.totalTransactions - b.totalTransactions
        )[0];
        break;
        
      case 'ACTIVE':
        // Select recently used wallet
        selectedWallet = eligibleWallets.sort((a, b) => 
          b.lastUsed - a.lastUsed
        )[0];
        break;
        
      case 'DORMANT':
        // Select wallet that hasn't been used recently
        const oneHourAgo = Date.now() - 3600000;
        const dormantWallets = eligibleWallets.filter(w => w.lastUsed < oneHourAgo);
        selectedWallet = dormantWallets.length > 0 
          ? dormantWallets[randomInt(0, dormantWallets.length)]
          : eligibleWallets[randomInt(0, eligibleWallets.length)];
        break;
        
      case 'RANDOM':
      default:
        // Random selection
        selectedWallet = eligibleWallets[randomInt(0, eligibleWallets.length)];
    }
    
    // Update usage stats
    selectedWallet.lastUsed = Date.now();
    selectedWallet.totalTransactions++;
    
    console.log(`🎯 Selected wallet: ${selectedWallet.publicKey.slice(0, 8)}... (Profile: ${profile.walletPreference})`);
    
    return selectedWallet.keypair;
  }
  
  /**
   * Update all wallet balances
   */
  private async updateBalances(): Promise<void> {
    const promises = Array.from(this.wallets.values()).map(async (walletInfo) => {
      try {
        walletInfo.balance = await this.connection.getBalance(
          new PublicKey(walletInfo.publicKey)
        );
      } catch (error) {
        console.error(`Failed to update balance for ${walletInfo.publicKey}:`, error);
      }
    });
    
    await Promise.all(promises);
  }
  
  /**
   * Get wallet statistics
   */
  getStats(): {
    totalWallets: number;
    walletsWithBalance: number;
    totalBalance: number;
    averageBalance: number;
  } {
    const walletsWithBalance = Array.from(this.wallets.values())
      .filter(w => w.balance >= this.minBalance);
    
    const totalBalance = Array.from(this.wallets.values())
      .reduce((sum, w) => sum + w.balance, 0);
    
    return {
      totalWallets: this.wallets.size,
      walletsWithBalance: walletsWithBalance.length,
      totalBalance: totalBalance / LAMPORTS_PER_SOL,
      averageBalance: totalBalance / LAMPORTS_PER_SOL / this.wallets.size
    };
  }
  
  /**
   * Save wallet pool state (for recovery)
   */
  async saveState(): Promise<void> {
    const state = {
      wallets: Array.from(this.wallets.entries()).map(([pubkey, info]) => ({
        publicKey: pubkey,
        lastUsed: info.lastUsed,
        totalTransactions: info.totalTransactions,
        createdAt: info.createdAt
      }))
    };
    
    const statePath = path.join(this.vaultPath, 'wallet-state.json');
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
}