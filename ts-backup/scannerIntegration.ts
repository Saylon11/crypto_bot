// HootBot/src/scanners/scannerIntegration.ts

// Integration helper for unified scanner
// This file helps integrate the scanner with other parts of HootBot

import { walletManager } from '../core/multiWalletManager';

export interface ScannerStats {
  totalScans: number;
  tokensFound: number;
  tradesExecuted: number;
  successRate: number;
}

export class ScannerIntegration {
  private stats: ScannerStats = {
    totalScans: 0,
    tokensFound: 0,
    tradesExecuted: 0,
    successRate: 0
  };

  /**
   * Get current scanner statistics
   */
  getStats(): ScannerStats {
    return { ...this.stats };
  }

  /**
   * Update scanner statistics
   */
  updateStats(scans: number, tokens: number, trades: number): void {
    this.stats.totalScans += scans;
    this.stats.tokensFound += tokens;
    this.stats.tradesExecuted += trades;
    
    // Calculate success rate
    this.stats.successRate = this.stats.totalScans > 0 
      ? (this.stats.tradesExecuted / this.stats.totalScans) * 100 
      : 0;
  }

  /**
   * Get wallet pool statistics
   */
  getWalletStats() {
    return walletManager.getWalletStats();
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalScans: 0,
      tokensFound: 0,
      tradesExecuted: 0,
      successRate: 0
    };
  }
}

// Export singleton instance
export const scannerIntegration = new ScannerIntegration();