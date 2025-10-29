// HootBot/src/bots/volume/volumeChurnBotMicro.ts

import dotenv from 'dotenv';
dotenv.config();

import { Connection, PublicKey, Keypair, VersionedTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';

// Just copy your existing VolumeChurnBot but change these key parameters:

export class VolumeChurnBot {
  // ... [keeping all the same structure as before] ...

  private async executeNextTrade(): Promise<void> {
    try {
      const wallet = this.getRandomWallet();
      
      // MICRO TRADES: 0.01-0.05 SOL (was 0.05-0.5)
      const tradeSize = 0.01 + Math.random() * 0.04;
      
      // 90% churn, 10% support buy
      const isSupport = Math.random() < 0.10;
      
      if (isSupport) {
        console.log(`🎯 Support buy: ${tradeSize.toFixed(3)} SOL`);
        // ... [rest of trade logic stays the same]
      } else {
        console.log(`🔄 Churn trade: ${tradeSize.toFixed(3)} SOL`);
        // ... [rest of trade logic stays the same]
      }
      
    } catch (error) {
      console.error(`❌ Trade error:`, error);
      this.updateMetrics(0, false);
    }
  }

  async run(): Promise<void> {
    console.log(`\n🚀 Starting MICRO Volume Churn Bot\n`);
    console.log(`💰 Trade sizes: 0.01-0.05 SOL`);
    console.log(`⚡ High frequency mode activated\n`);
    
    this.isRunning = true;
    
    const loop = async () => {
      if (!this.isRunning) return;
      
      await this.executeNextTrade();
      
      // FASTER TRADES: 2-6 minutes between trades (was 5-15)
      const baseDelay = 4 * 60 * 1000; // 4 minute average
      const delay = this.getNextTradeDelay(baseDelay);
      console.log(`⏱️ Next trade in ${Math.round(delay / 60000)} minutes`);
      
      setTimeout(loop, delay);
    };
    
    loop();
  }
}