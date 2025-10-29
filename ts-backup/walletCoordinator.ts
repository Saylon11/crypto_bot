// HootBot/src/pumpTools/walletCoordinator.ts

import { Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getHeliusConnection } from '../utils/heliusConnection';
import { HumanBehaviorEngine } from './humanBehaviorEngine';
import { getEnhancedExecutor } from './enhancedTradeExecutor';
import bs58 from 'bs58';
import * as fs from 'fs';
import path from 'path';

interface WalletProfile {
  keypair: Keypair;
  address: string;
  role: 'main' | 'sniper' | 'dca' | 'reserve';
  behaviorEngine: HumanBehaviorEngine;
  stats: {
    totalTrades: number;
    successfulTrades: number;
    totalVolume: number;
    lastUsed: number;
    profitLoss: number;
  };
  limits: {
    maxPositionSize: number;
    dailyTradeLimit: number;
    cooldownMinutes: number;
  };
}

interface CoordinatedAttack {
  tokenMint: string;
  totalAmount: number;
  walletCount: number;
  strategy: 'wave' | 'burst' | 'gradual' | 'random';
  timeWindow: number; // milliseconds
}

export class WalletCoordinator {
  private wallets: Map<string, WalletProfile> = new Map();
  private connection = getHeliusConnection();
  private executor = getEnhancedExecutor();
  
  constructor() {
    this.loadWallets();
  }

  // Load wallets from configuration
  private loadWallets(): void {
    // Main wallet
    const mainWallet = this.loadMainWallet();
    if (mainWallet) {
      this.addWallet(mainWallet, 'main', new HumanBehaviorEngine('balanced'));
    }

    // Load additional wallets from directory
    const walletsDir = path.join(process.cwd(), 'wallets');
    if (fs.existsSync(walletsDir)) {
      const files = fs.readdirSync(walletsDir).filter(f => f.endsWith('.json'));
      
      files.forEach((file, index) => {
        try {
          const keypairData = JSON.parse(
            fs.readFileSync(path.join(walletsDir, file), 'utf-8')
          );
          const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
          
          // Assign roles and behaviors
          const role = index < 2 ? 'sniper' : index < 4 ? 'dca' : 'reserve';
          const behavior = this.assignBehavior(role);
          
          this.addWallet(keypair, role, new HumanBehaviorEngine(behavior));
          console.log(`✅ Loaded wallet ${index + 1}: ${keypair.publicKey.toBase58().slice(0, 8)}... (${role})`);
        } catch (error) {
          console.error(`Failed to load wallet ${file}:`, error);
        }
      });
    }

    console.log(`\n💼 Total wallets loaded: ${this.wallets.size}`);
  }

  // Load main wallet
  private loadMainWallet(): Keypair | null {
    const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
    if (keypairPath && fs.existsSync(keypairPath)) {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    }
    
    const secretKey = process.env.WALLET_SECRET_KEY;
    if (secretKey) {
      return Keypair.fromSecretKey(bs58.decode(secretKey));
    }
    
    return null;
  }

  // Assign behavior based on role
  private assignBehavior(role: string): 'aggressive' | 'cautious' | 'balanced' | 'fomo' | 'patient' {
    switch (role) {
      case 'sniper': return 'aggressive';
      case 'dca': return 'patient';
      case 'reserve': return 'cautious';
      default: return 'balanced';
    }
  }

  // Add wallet to coordinator
  private addWallet(
    keypair: Keypair,
    role: WalletProfile['role'],
    behaviorEngine: HumanBehaviorEngine
  ): void {
    const address = keypair.publicKey.toBase58();
    
    const limits = {
      main: { maxPositionSize: 1.0, dailyTradeLimit: 50, cooldownMinutes: 5 },
      sniper: { maxPositionSize: 0.5, dailyTradeLimit: 20, cooldownMinutes: 10 },
      dca: { maxPositionSize: 0.2, dailyTradeLimit: 30, cooldownMinutes: 15 },
      reserve: { maxPositionSize: 0.1, dailyTradeLimit: 10, cooldownMinutes: 30 }
    };

    this.wallets.set(address, {
      keypair,
      address,
      role,
      behaviorEngine,
      stats: {
        totalTrades: 0,
        successfulTrades: 0,
        totalVolume: 0,
        lastUsed: 0,
        profitLoss: 0
      },
      limits: limits[role]
    });
  }

  // Get wallet balances
  async getWalletBalances(): Promise<Map<string, number>> {
    const balances = new Map<string, number>();
    
    const addresses = Array.from(this.wallets.keys()).map(a => new PublicKey(a));
    const accountInfos = await this.connection.getMultipleAccountsInfoEfficient(addresses);
    
    addresses.forEach((address, index) => {
      const balance = accountInfos[index]?.lamports || 0;
      balances.set(address.toBase58(), balance / LAMPORTS_PER_SOL);
    });
    
    return balances;
  }

  // Execute coordinated buy across multiple wallets
  async executeCoordinatedBuy(params: CoordinatedAttack): Promise<string[]> {
    console.log('\n🎯 COORDINATED BUY INITIATED');
    console.log('━'.repeat(50));
    console.log(`Token: ${params.tokenMint}`);
    console.log(`Total Amount: ${params.totalAmount} SOL`);
    console.log(`Strategy: ${params.strategy}`);
    console.log(`Wallets: ${params.walletCount}`);
    console.log('━'.repeat(50));

    // Get available wallets
    const availableWallets = await this.getAvailableWallets(params.walletCount);
    if (availableWallets.length === 0) {
      console.error('❌ No available wallets');
      return [];
    }

    // Calculate amount per wallet
    const amountPerWallet = params.totalAmount / availableWallets.length;
    const signatures: string[] = [];

    // Execute based on strategy
    switch (params.strategy) {
      case 'burst':
        // All wallets buy simultaneously
        const promises = availableWallets.map(wallet => 
          this.executeSingleWalletBuy(wallet, params.tokenMint, amountPerWallet)
        );
        const results = await Promise.allSettled(promises);
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            signatures.push(result.value);
          }
        });
        break;

      case 'wave':
        // Wallets buy in waves
        const waveSize = Math.ceil(availableWallets.length / 3);
        for (let i = 0; i < availableWallets.length; i += waveSize) {
          const wave = availableWallets.slice(i, i + waveSize);
          console.log(`\n🌊 Wave ${Math.floor(i / waveSize) + 1}`);
          
          const wavePromises = wave.map(wallet => 
            this.executeSingleWalletBuy(wallet, params.tokenMint, amountPerWallet)
          );
          
          const waveResults = await Promise.allSettled(wavePromises);
          waveResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              signatures.push(result.value);
            }
          });
          
          // Delay between waves
          if (i + waveSize < availableWallets.length) {
            const delay = params.timeWindow / 3;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
        break;

      case 'gradual':
        // Wallets buy one by one with delays
        const delayBetween = params.timeWindow / availableWallets.length;
        for (const wallet of availableWallets) {
          const sig = await this.executeSingleWalletBuy(wallet, params.tokenMint, amountPerWallet);
          if (sig) signatures.push(sig);
          
          // Wait before next buy
          await new Promise(resolve => setTimeout(resolve, delayBetween));
        }
        break;

      case 'random':
        // Random timing for each wallet
        const randomPromises = availableWallets.map(async (wallet) => {
          const randomDelay = Math.random() * params.timeWindow;
          await new Promise(resolve => setTimeout(resolve, randomDelay));
          return this.executeSingleWalletBuy(wallet, params.tokenMint, amountPerWallet);
        });
        
        const randomResults = await Promise.allSettled(randomPromises);
        randomResults.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            signatures.push(result.value);
          }
        });
        break;
    }

    // Summary
    console.log('\n📊 COORDINATED BUY SUMMARY');
    console.log('━'.repeat(50));
    console.log(`✅ Successful: ${signatures.length}/${availableWallets.length}`);
    console.log(`💰 Total Volume: ${signatures.length * amountPerWallet} SOL`);
    console.log('━'.repeat(50));

    return signatures;
  }

  // Execute buy for single wallet
  private async executeSingleWalletBuy(
    wallet: WalletProfile,
    tokenMint: string,
    amount: number
  ): Promise<string | null> {
    try {
      // Check wallet balance
      const balance = await this.connection.getBalance(wallet.keypair.publicKey);
      if (balance < (amount + 0.01) * LAMPORTS_PER_SOL) {
        console.log(`⚠️ Wallet ${wallet.address.slice(0, 8)}... has insufficient balance`);
        return null;
      }

      // Use wallet's behavior engine for human-like execution
      const signature = await wallet.behaviorEngine.executeHumanTrade(
        tokenMint,
        75, // Default MIND score
        amount
      );

      if (signature) {
        // Update wallet stats
        wallet.stats.totalTrades++;
        wallet.stats.successfulTrades++;
        wallet.stats.totalVolume += amount;
        wallet.stats.lastUsed = Date.now();
        
        console.log(`✅ ${wallet.address.slice(0, 8)}... bought ${amount} SOL`);
      }

      return signature;
    } catch (error) {
      console.error(`❌ ${wallet.address.slice(0, 8)}... failed:`, error);
      wallet.stats.totalTrades++;
      return null;
    }
  }

  // Get available wallets based on cooldown and limits
  private async getAvailableWallets(maxCount: number): Promise<WalletProfile[]> {
    const now = Date.now();
    const balances = await this.getWalletBalances();
    
    const available = Array.from(this.wallets.values())
      .filter(wallet => {
        // Check cooldown
        const cooldownMs = wallet.limits.cooldownMinutes * 60 * 1000;
        if (now - wallet.stats.lastUsed < cooldownMs) {
          return false;
        }
        
        // Check balance
        const balance = balances.get(wallet.address) || 0;
        if (balance < 0.05) { // Minimum 0.05 SOL
          return false;
        }
        
        // Check daily limit (simplified - in production, track by date)
        // For now, we'll just check if they've traded recently
        return true;
      })
      .sort((a, b) => a.stats.lastUsed - b.stats.lastUsed) // Prioritize least recently used
      .slice(0, maxCount);
    
    return available;
  }

  // Get wallet statistics
  getWalletStats(): void {
    console.log('\n📊 WALLET STATISTICS');
    console.log('━'.repeat(80));
    console.log('Address         | Role    | Trades | Success | Volume  | P&L     | Last Used');
    console.log('━'.repeat(80));
    
    this.wallets.forEach(wallet => {
      const successRate = wallet.stats.totalTrades > 0 
        ? (wallet.stats.successfulTrades / wallet.stats.totalTrades * 100).toFixed(1)
        : '0.0';
      
      const lastUsed = wallet.stats.lastUsed 
        ? new Date(wallet.stats.lastUsed).toLocaleTimeString()
        : 'Never';
      
      console.log(
        `${wallet.address.slice(0, 12)}... | ${wallet.role.padEnd(7)} | ${wallet.stats.totalTrades.toString().padEnd(6)} | ${successRate.padEnd(7)}% | ${wallet.stats.totalVolume.toFixed(2).padEnd(7)} | ${wallet.stats.profitLoss.toFixed(2).padEnd(7)} | ${lastUsed}`
      );
    });
    console.log('━'.repeat(80));
  }
}

// Export singleton instance
let coordinatorInstance: WalletCoordinator | null = null;

export function getWalletCoordinator(): WalletCoordinator {
  if (!coordinatorInstance) {
    coordinatorInstance = new WalletCoordinator();
  }
  return coordinatorInstance;
}