// src/core/engine.ts
import { getWalletManager } from './walletManager';
import { bootstrap, getConnection } from './bootstrap';
import { PublicKey } from '@solana/web3.js';

/**
 * HootBot Main Engine
 * This orchestrates the body based on M.I.N.D. directives
 */
export class HootBotEngine {
  private isRunning: boolean = false;
  private mindPollingInterval: NodeJS.Timeout | null = null;

  constructor() {
    console.log('🦉 HootBot Engine initialized');
  }

  /**
   * Start the engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('⚠️ Engine already running');
      return;
    }

    console.log('🚀 Starting HootBot Engine...');
    
    try {
      // Bootstrap system
      await bootstrap();
      
      // Verify wallet integrity
      const walletManager = getWalletManager();
      const integrityCheck = await walletManager.verifyWalletIntegrity();
      
      if (!integrityCheck) {
        throw new Error('Wallet integrity check failed');
      }

      this.isRunning = true;
      console.log('✅ HootBot Engine started successfully');
      
      // Start listening for M.I.N.D. directives
      this.startMindListener();
      
    } catch (error) {
      console.error('❌ Failed to start engine:', error);
      throw error;
    }
  }

  /**
   * Stop the engine
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping HootBot Engine...');
    
    if (this.mindPollingInterval) {
      clearInterval(this.mindPollingInterval);
      this.mindPollingInterval = null;
    }

    this.isRunning = false;
    console.log('✅ HootBot Engine stopped');
  }

  /**
   * Start listening for M.I.N.D. directives
   */
  private startMindListener(): void {
    // This would connect to M.I.N.D. API in production
    // For now, we'll simulate with polling
    console.log('👂 Listening for M.I.N.D. directives...');
    
    this.mindPollingInterval = setInterval(() => {
      this.checkForDirectives();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Check for new directives from M.I.N.D.
   */
  private async checkForDirectives(): Promise<void> {
    // In production, this would fetch from M.I.N.D. API
    // Following the one-way communication principle
    console.log('🔍 Checking for M.I.N.D. directives...');
  }

  /**
   * Get engine status
   */
  public getStatus(): { running: boolean; wallets: number; uptime: number } {
    const walletManager = getWalletManager();
    const walletCount = walletManager.getAllPublicKeys().length;
    
    return {
      running: this.isRunning,
      wallets: walletCount,
      uptime: process.uptime()
    };
  }
}

// Singleton engine instance
let engineInstance: HootBotEngine | null = null;

export function getEngine(): HootBotEngine {
  if (!engineInstance) {
    engineInstance = new HootBotEngine();
  }
  return engineInstance;
}