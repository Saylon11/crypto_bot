// HootBot/src/bots/volume/volumeChurnBot.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import fs from 'fs';
import { getBuySize, getNextTradeDelay } from '../../pumpTools/randomUtils';
import { loadMainWallet, loadDistributionWallets, LoadedWallet } from '../walletLoader';

dotenv.config();

// Jupiter API endpoints
const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const JUPITER_SWAP_API = 'https://quote-api.jup.ag/v6/swap';

interface VolumeChurnConfig {
  tokenMint: string;
  wallets: string[];
  minTradeSize: number;
  maxTradeSize: number;
  minCooldown: number;
  targetDailyVolume: number;
  slippageBps: number;
}

class VolumeChurnBot {
  private config: VolumeChurnConfig;
  private connection: Connection;
  private walletPool: Map<string, { keypair: Keypair; lastUsed: number; type: string }>;
  private volumeGenerated: number = 0;
  private isRunning: boolean = false;

  constructor() {
    // Use FATBEAR token from your .env
    this.config = {
      tokenMint: process.env.FATBEAR_TOKEN_MINT || process.env.PRIMARY_TOKEN_MINT || '',
      wallets: [], // Not used anymore, loaded via walletLoader
      minTradeSize: parseFloat(process.env.MIN_TRADE_SIZE_SOL || '0.05'),
      maxTradeSize: parseFloat(process.env.MAX_TRADE_SIZE_SOL || '0.5'),
      minCooldown: parseFloat(process.env.MIN_WALLET_COOLDOWN_MINUTES || '30') * 60 * 1000,
      targetDailyVolume: parseFloat(process.env.DAILY_VOLUME_TARGET_SOL || '400'),
      slippageBps: parseFloat(process.env.MAX_SLIPPAGE_BPS || '50')
    };

    // Initialize connection with Helius
    const heliusKey = process.env.HELIUS_API_KEY;
    this.connection = new Connection(
      heliusKey ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}` : 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );

    // Initialize wallet pool using walletLoader
    this.walletPool = new Map();
    this.initializeWalletsFromLoader();

    console.log('🦉 Volume Churn Bot initialized');
    console.log(`📊 Token: ${this.config.tokenMint}`);
    console.log(`🎯 Daily volume target: ${this.config.targetDailyVolume} SOL`);
    console.log(`💼 Wallet pool size: ${this.walletPool.size}`);
  }

  private initializeWalletsFromLoader() {
    // Load distribution wallets using the walletLoader
    const wallets = loadDistributionWallets();
    
    for (const wallet of wallets) {
      this.walletPool.set(wallet.publicKey, {
        keypair: wallet.keypair,
        lastUsed: 0,
        type: wallet.type
      });
      console.log(`✅ Loaded ${wallet.type} wallet: ${wallet.publicKey.slice(0, 8)}...`);
    }
    
    if (this.walletPool.size === 0) {
      console.error('❌ No distribution wallets loaded! Check your .env configuration');
      console.log('💡 Run: npx ts-node src/utils/fixWallets.ts to diagnose');
    }
  }

  private loadWalletKeys(): string[] {
    const wallets: string[] = [];
    
    // Load strategic wallets from env
    const walletTypes = ['WHALE', 'DOLPHIN', 'FISH'];
    const walletNumbers = [1, 2];
    
    for (const type of walletTypes) {
      for (const num of walletNumbers) {
        const key = process.env[`${type}_WALLET_${num}`];
        if (key && key.length > 10) {
          wallets.push(key);
        }
      }
    }
    
    return wallets;
  }

  private initializeWallets() {
    for (const walletKey of this.config.wallets) {
      try {
        // Parse the wallet key - it appears to be base58 encoded
        const keypair = Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(`[${walletKey}]`))
        );
        
        this.walletPool.set(keypair.publicKey.toString(), {
          keypair,
          lastUsed: 0
        });
        
        console.log(`✅ Loaded wallet: ${keypair.publicKey.toString().slice(0, 8)}...`);
      } catch (error) {
        console.error(`❌ Failed to load wallet:`, error);
      }
    }
  }

  private getAvailableWallet(): { keypair: Keypair; type: string } | null {
    const now = Date.now();
    
    for (const [address, wallet] of this.walletPool) {
      if (now - wallet.lastUsed > this.config.minCooldown) {
        wallet.lastUsed = now;
        return { keypair: wallet.keypair, type: wallet.type };
      }
    }
    
    console.log('⏳ All wallets on cooldown');
    return null;
  }

  async executeChurnTrade(isBuy: boolean = true): Promise<boolean> {
    const walletInfo = this.getAvailableWallet();
    if (!walletInfo) return false;

    const { keypair: wallet, type: walletType } = walletInfo;

    const amountSol = getBuySize(
      (this.config.minTradeSize + this.config.maxTradeSize) / 2
    );

    console.log(`\n🔄 Executing ${isBuy ? 'BUY' : 'SELL'} churn trade`);
    console.log(`💰 Amount: ${amountSol.toFixed(4)} SOL`);
    console.log(`👛 ${walletType.charAt(0).toUpperCase() + walletType.slice(1)} wallet: ${wallet.publicKey.toString().slice(0, 8)}...`);

    try {
      // Check wallet balance first
      const balance = await this.connection.getBalance(wallet.publicKey);
      const balanceSol = balance / LAMPORTS_PER_SOL;
      
      if (balanceSol < amountSol + 0.01) {
        console.error(`❌ Insufficient balance: ${balanceSol.toFixed(4)} SOL`);
        return false;
      }

      // Execute the swap
      const result = await this.executeJupiterSwap(
        isBuy ? 'So11111111111111111111111111111111111111112' : this.config.tokenMint,
        isBuy ? this.config.tokenMint : 'So11111111111111111111111111111111111111112',
        amountSol,
        wallet
      );

      if (result.success) {
        this.volumeGenerated += amountSol;
        console.log(`✅ Trade successful! TX: ${result.signature}`);
        console.log(`📈 Total volume: ${this.volumeGenerated.toFixed(2)} SOL`);
        return true;
      } else {
        console.error(`❌ Trade failed: ${result.error}`);
        return false;
      }

    } catch (error) {
      console.error('❌ Trade execution error:', error);
      return false;
    }
  }

  private async executeJupiterSwap(
    inputMint: string,
    outputMint: string,
    amountSol: number,
    wallet: Keypair
  ): Promise<{ success: boolean; signature?: string; error?: string }> {
    try {
      // Get quote
      const amountLamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
      const quoteUrl = `${JUPITER_QUOTE_API}/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${amountLamports}&` +
        `slippageBps=${this.config.slippageBps}`;

      const quoteResponse = await fetch(quoteUrl);
      if (!quoteResponse.ok) {
        const error = await quoteResponse.text();
        return { success: false, error: `Quote failed: ${error}` };
      }

      const quoteData = await quoteResponse.json();
      console.log(`📊 Quote received - Price impact: ${quoteData.priceImpactPct}%`);

      // Get swap transaction
      const swapResponse = await fetch(JUPITER_SWAP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });

      if (!swapResponse.ok) {
        const error = await swapResponse.text();
        return { success: false, error: `Swap failed: ${error}` };
      }

      const swapData = await swapResponse.json();
      const swapTransaction = Buffer.from(swapData.swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransaction);

      // Sign and send
      transaction.sign([wallet]);
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: true,
          maxRetries: 2
        }
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      return { success: true, signature };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async start() {
    console.log('\n🚀 Starting Volume Churn Bot...');
    this.isRunning = true;

    while (this.isRunning) {
      try {
        // Alternate between buy and sell
        const isBuy = Math.random() > 0.5;
        await this.executeChurnTrade(isBuy);

        // Random delay between trades
        const delay = getNextTradeDelay(60000); // 60 second average
        console.log(`⏱️ Next trade in ${(delay / 1000).toFixed(1)}s`);
        
        await new Promise(resolve => setTimeout(resolve, delay));

        // Check daily volume target
        if (this.volumeGenerated >= this.config.targetDailyVolume) {
          console.log(`🎯 Daily volume target reached: ${this.volumeGenerated.toFixed(2)} SOL`);
          break;
        }

      } catch (error) {
        console.error('❌ Bot error:', error);
        await new Promise(resolve => setTimeout(resolve, 30000)); // 30s on error
      }
    }
  }

  stop() {
    console.log('🛑 Stopping Volume Churn Bot...');
    this.isRunning = false;
  }
}

// Initialize and export
const volumeChurnBot = new VolumeChurnBot();

// Start if run directly
if (require.main === module) {
  volumeChurnBot.start().catch(console.error);
}

export { VolumeChurnBot, volumeChurnBot };