// HootBot/src/pumpTools/enhancedRaidHootBot.ts

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';
import { getEnhancedExecutor } from './enhancedTradeExecutor';
import { getHeliusConnection } from '../utils/heliusConnection';
import { logRaid } from '../utils/logger';

dotenv.config();

// Enhanced configuration with Professional features
const RAID_CONFIG = {
  baseMultiplier: 0.05,      // Base raid amount in SOL
  raidCount: 10,             // Number of raid buys
  minDelay: 2000,            // Minimum delay between raids
  maxDelay: 5000,            // Maximum delay (randomized)
  priorityMode: true,        // Use high priority fees
  batchMonitoring: true,     // Monitor multiple tokens
  adaptiveTiming: true       // Adjust timing based on network conditions
};

export class EnhancedRaidBot {
  private executor = getEnhancedExecutor();
  private connection = getHeliusConnection('confirmed');
  private wallet: Keypair;
  private activeRaids: Map<string, boolean> = new Map();

  constructor() {
    this.wallet = this.loadWallet();
  }

  private loadWallet(): Keypair {
    const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
    if (keypairPath && fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    }
    
    const secretKey = process.env.WALLET_SECRET_KEY;
    if (!secretKey) {
      throw new Error('No wallet configured!');
    }
    
    return Keypair.fromSecretKey(bs58.decode(secretKey));
  }

  // Execute enhanced raid sequence
  async executeRaidSequence(
    tokenMint?: string,
    skipMind: boolean = false
  ): Promise<void> {
    const targetToken = tokenMint || process.env.TARGET_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS;
    
    if (!targetToken) {
      throw new Error('No token mint configured for raids!');
    }

    // Prevent duplicate raids
    if (this.activeRaids.get(targetToken)) {
      console.log('⚠️ Raid already in progress for this token');
      return;
    }

    this.activeRaids.set(targetToken, true);

    console.log('\n🚀 ENHANCED RAID SEQUENCE INITIATED 🚀');
    console.log('━'.repeat(50));
    console.log(`🎯 Target: ${targetToken}`);
    console.log(`🧠 MIND Analysis: ${skipMind ? 'BYPASSED' : 'ENABLED'}`);
    console.log(`⚡ Mode: Helius Professional`);
    console.log('━'.repeat(50));

    try {
      // Check wallet balance
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      const balanceSol = balance / LAMPORTS_PER_SOL;
      console.log(`\n💰 Wallet Balance: ${balanceSol.toFixed(4)} SOL`);

      const totalRequired = RAID_CONFIG.baseMultiplier * RAID_CONFIG.raidCount * 1.1; // 10% buffer
      if (balanceSol < totalRequired) {
        console.error(`❌ Insufficient balance. Need ${totalRequired.toFixed(3)} SOL`);
        return;
      }

      // Get network conditions for adaptive timing
      const networkConditions = await this.assessNetworkConditions();
      console.log(`\n📊 Network Status: ${networkConditions.status}`);
      console.log(`   Avg Block Time: ${networkConditions.avgBlockTime}ms`);
      console.log(`   Congestion: ${networkConditions.congestion}`);

      // Monitor token price in real-time
      if (RAID_CONFIG.batchMonitoring) {
        this.startPriceMonitoring(targetToken);
      }

      // Execute raid waves
      const results = await this.executeRaidWaves(targetToken, networkConditions);
      
      // Summary
      console.log('\n📊 RAID SUMMARY');
      console.log('━'.repeat(50));
      console.log(`✅ Successful: ${results.successful}`);
      console.log(`❌ Failed: ${results.failed}`);
      console.log(`💸 Total Volume: ${results.totalVolume.toFixed(3)} SOL`);
      console.log(`⏱️ Duration: ${results.duration}s`);
      console.log('━'.repeat(50));

      // Log to file
      await logRaid({
        timestamp: new Date().toISOString(),
        tokenMint: targetToken,
        successful: results.successful,
        failed: results.failed,
        totalVolume: results.totalVolume,
        duration: results.duration
      });

    } catch (error) {
      console.error('❌ Raid sequence failed:', error);
    } finally {
      this.activeRaids.delete(targetToken);
      await this.executor.cleanup();
    }
  }

  // Execute raid waves with adaptive timing
  private async executeRaidWaves(
    tokenMint: string,
    networkConditions: any
  ): Promise<any> {
    const startTime = Date.now();
    let successful = 0;
    let failed = 0;
    let totalVolume = 0;

    for (let i = 0; i < RAID_CONFIG.raidCount; i++) {
      console.log(`\n🎯 Raid ${i + 1}/${RAID_CONFIG.raidCount}`);
      
      try {
        // Vary amount for each buy
        const variation = 0.8 + Math.random() * 0.4; // 80% to 120%
        const amount = RAID_CONFIG.baseMultiplier * variation;
        
        // Use panic buy for first few raids
        const signature = i < 3 
          ? await this.executor.executePanicBuy(tokenMint, amount)
          : await this.executor.executeBuy(tokenMint, amount);
        
        if (signature) {
          successful++;
          totalVolume += amount;
          console.log(`✅ Raid ${i + 1} successful: ${amount.toFixed(3)} SOL`);
        } else {
          failed++;
          console.log(`❌ Raid ${i + 1} failed`);
        }

      } catch (error) {
        failed++;
        console.error(`❌ Raid ${i + 1} error:`, error);
      }

      // Adaptive delay based on network conditions
      if (i < RAID_CONFIG.raidCount - 1) {
        const delay = this.calculateAdaptiveDelay(i, networkConditions);
        console.log(`⏳ Waiting ${delay}ms before next raid...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return {
      successful,
      failed,
      totalVolume,
      duration: Math.round((Date.now() - startTime) / 1000)
    };
  }

  // Assess network conditions
  private async assessNetworkConditions(): Promise<any> {
    try {
      const samples = 5;
      const blockTimes: number[] = [];
      
      for (let i = 0; i < samples; i++) {
        const start = Date.now();
        await this.connection.getSlot();
        blockTimes.push(Date.now() - start);
      }

      const avgBlockTime = blockTimes.reduce((a, b) => a + b) / samples;
      const congestion = avgBlockTime > 500 ? 'high' : avgBlockTime > 200 ? 'medium' : 'low';

      return {
        status: congestion === 'high' ? '🔴 Congested' : congestion === 'medium' ? '🟡 Moderate' : '🟢 Clear',
        avgBlockTime: Math.round(avgBlockTime),
        congestion
      };
    } catch (error) {
      console.error('Failed to assess network:', error);
      return {
        status: '⚫ Unknown',
        avgBlockTime: 400,
        congestion: 'medium'
      };
    }
  }

  // Calculate adaptive delay
  private calculateAdaptiveDelay(
    raidIndex: number,
    networkConditions: any
  ): number {
    let baseDelay = RAID_CONFIG.minDelay + Math.random() * 
      (RAID_CONFIG.maxDelay - RAID_CONFIG.minDelay);

    // Adjust based on network congestion
    if (networkConditions.congestion === 'high') {
      baseDelay *= 1.5; // Slow down during congestion
    } else if (networkConditions.congestion === 'low') {
      baseDelay *= 0.8; // Speed up when network is clear
    }

    // Progressive delay (start fast, slow down)
    const progressiveFactor = 1 + (raidIndex / RAID_CONFIG.raidCount) * 0.5;
    
    return Math.round(baseDelay * progressiveFactor);
  }

  // Start real-time price monitoring
  private async startPriceMonitoring(tokenMint: string): Promise<void> {
    await this.executor.monitorToken(tokenMint, (priceChange) => {
      if (Math.abs(priceChange) > 5) {
        console.log(`\n⚠️ PRICE ALERT: ${priceChange > 0 ? '📈' : '📉'} ${priceChange.toFixed(2)}%`);
      }
    });
  }

  // Execute multi-token raid
  async executeMultiTokenRaid(
    tokenMints: string[],
    amountPerToken: number = 0.05
  ): Promise<void> {
    console.log('\n🌟 MULTI-TOKEN RAID MODE 🌟');
    console.log(`Targets: ${tokenMints.length} tokens`);

    // Check balances for all tokens first
    const balances = await this.executor.batchCheckBalances(tokenMints);
    
    for (const tokenMint of tokenMints) {
      console.log(`\n🎯 Raiding ${tokenMint.slice(0, 8)}...`);
      await this.executeRaidSequence(tokenMint, true);
      
      // Delay between different tokens
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
}

// Export singleton instance
let raidBotInstance: EnhancedRaidBot | null = null;

export function getEnhancedRaidBot(): EnhancedRaidBot {
  if (!raidBotInstance) {
    raidBotInstance = new EnhancedRaidBot();
  }
  return raidBotInstance;
}

// Main execution function
export async function executeEnhancedRaid(
  skipMind: boolean = false
): Promise<void> {
  const raidBot = getEnhancedRaidBot();
  await raidBot.executeRaidSequence(undefined, skipMind);
}