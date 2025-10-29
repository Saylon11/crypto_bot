// src/core/humanWalletManager.ts
import { Keypair, PublicKey } from '@solana/web3.js';
import { getWalletManager, WalletManager } from './walletManager';

/**
 * Human-like wallet management wrapper
 * Implements the Human Realism Mandate
 */
export class HumanWalletManager {
  private walletManager: WalletManager;
  private lastActionTime: number = 0;
  private mainWallet: Keypair | null = null;

  constructor() {
    this.walletManager = getWalletManager();
    this.initializeMainWallet();
  }

  /**
   * Initialize the main wallet
   */
  private initializeMainWallet(): void {
    const wallets = this.walletManager.getAllPublicKeys();
    if (wallets.length > 0) {
      // Get the first wallet as main
      this.mainWallet = this.walletManager.getNextWallet();
    }
  }

  /**
   * Get wallet with human-like behavior
   */
  public async getWalletForTrade(executionProfile?: string): Promise<Keypair> {
    // Add human reaction time
    await this.simulateHumanReaction();
    
    return this.walletManager.getNextWallet(executionProfile);
  }

  /**
   * Simulate human reaction time
   */
  private async simulateHumanReaction(): Promise<void> {
    const now = Date.now();
    const timeSinceLastAction = now - this.lastActionTime;
    
    // If action too quick, add delay
    if (timeSinceLastAction < 1000) {
      const reactionTime = 1000 + Math.random() * 2000; // 1-3 seconds
      await new Promise(resolve => setTimeout(resolve, reactionTime));
    }
    
    this.lastActionTime = Date.now();
  }

  /**
   * Get wallet statistics
   */
  public getStats() {
    return this.walletManager.getWalletStats();
  }

  /**
   * Check if wallet is ready for use
   */
  public isReady(): boolean {
    return this.mainWallet !== null;
  }
}

// Export singleton instance
export const humanWalletManager = new HumanWalletManager();