// HootBot/src/bots/volume/simpleVolumeChurn.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Distribution wallet configuration
const DISTRIBUTION_WALLETS = {
  WHALE_1: process.env.WHALE_WALLET_1!,
  WHALE_2: process.env.WHALE_WALLET_2!,
  DOLPHIN_1: process.env.DOLPHIN_WALLET_1!,
  DOLPHIN_2: process.env.DOLPHIN_WALLET_2!,
  FISH_1: process.env.FISH_WALLET_1!
};

interface WalletInfo {
  keypair: Keypair;
  type: string;
  lastUsed: number;
}

class SimpleVolumeChurnBot {
  private connection: Connection;
  private wallets: Map<string, WalletInfo> = new Map();
  private tokenMint: string;
  private minCooldown: number = 30 * 60 * 1000; // 30 minutes
  private volumeGenerated: number = 0;

  constructor() {
    // Setup connection
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      'confirmed'
    );

    // Token to trade
    this.tokenMint = process.env.FATBEAR_TOKEN_MINT || process.env.PRIMARY_TOKEN_MINT || '';

    // Load wallets
    this.loadWallets();

    console.log('🦉 Simple Volume Churn Bot Ready');
    console.log(`📊 Token: ${this.tokenMint}`);
    console.log(`💼 Loaded ${this.wallets.size} wallets`);
  }

  private loadWallets() {
    Object.entries(DISTRIBUTION_WALLETS).forEach(([name, keyString]) => {
      try {
        const keypair = Keypair.fromSecretKey(bs58.decode(keyString));
        this.wallets.set(keypair.publicKey.toString(), {
          keypair,
          type: name.split('_')[0].toLowerCase(),
          lastUsed: 0
        });
        console.log(`✅ Loaded ${name}: ${keypair.publicKey.toString().slice(0, 8)}...`);
      } catch (error) {
        console.error(`❌ Failed to load ${name}`);
      }
    });
  }

  private getAvailableWallet(): WalletInfo | null {
    const now = Date.now();
    
    for (const [address, wallet] of this.wallets) {
      if (now - wallet.lastUsed > this.minCooldown) {
        wallet.lastUsed = now;
        return wallet;
      }
    }
    
    console.log('⏳ All wallets on cooldown');
    return null;
  }

  async executeTrade(amountSol: number = 0.1, isBuy: boolean = true) {
    const wallet = this.getAvailableWallet();
    if (!wallet) {
      console.log('No wallet available');
      return false;
    }

    console.log(`\n🔄 ${isBuy ? 'BUYING' : 'SELLING'} ${amountSol} SOL worth`);
    console.log(`👛 Using ${wallet.type} wallet: ${wallet.keypair.publicKey.toString().slice(0, 8)}...`);

    try {
      // Check balance
      const balance = await this.connection.getBalance(wallet.keypair.publicKey);
      const balanceSol = balance / LAMPORTS_PER_SOL;
      console.log(`💰 Wallet balance: ${balanceSol.toFixed(4)} SOL`);

      if (balanceSol < amountSol + 0.01) {
        console.log('❌ Insufficient balance');
        return false;
      }

      // Get Jupiter quote
      const inputMint = isBuy ? 'So11111111111111111111111111111111111111112' : this.tokenMint;
      const outputMint = isBuy ? this.tokenMint : 'So11111111111111111111111111111111111111112';
      
      const quoteResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=${inputMint}&` +
        `outputMint=${outputMint}&` +
        `amount=${Math.floor(amountSol * LAMPORTS_PER_SOL)}&` +
        `slippageBps=50`
      );

      if (!quoteResponse.ok) {
        console.error('❌ Failed to get quote');
        return false;
      }

      const quoteData = await quoteResponse.json();
      console.log(`📊 Price impact: ${quoteData.priceImpactPct}%`);

      // Get swap transaction
      const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: wallet.keypair.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto'
        })
      });

      if (!swapResponse.ok) {
        console.error('❌ Failed to get swap transaction');
        return false;
      }

      const { swapTransaction } = await swapResponse.json();
      const transaction = VersionedTransaction.deserialize(
        Buffer.from(swapTransaction, 'base64')
      );

      // Sign and send
      transaction.sign([wallet.keypair]);
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: true, maxRetries: 2 }
      );

      console.log(`✅ Transaction sent: ${signature}`);
      
      // Wait for confirmation
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        console.error('❌ Transaction failed');
        return false;
      }

      this.volumeGenerated += amountSol;
      console.log(`✅ Trade successful!`);
      console.log(`📈 Total volume: ${this.volumeGenerated.toFixed(2)} SOL`);
      
      return true;

    } catch (error) {
      console.error('❌ Trade error:', error);
      return false;
    }
  }

  async run() {
    console.log('\n🚀 Starting volume generation...\n');

    while (true) {
      try {
        // Random trade size between 0.05 and 0.5 SOL
        const tradeSize = 0.05 + Math.random() * 0.45;
        
        // Randomly buy or sell
        const isBuy = Math.random() > 0.5;
        
        await this.executeTrade(tradeSize, isBuy);

        // Random delay between 1-3 minutes
        const delay = (60 + Math.random() * 120) * 1000;
        console.log(`⏱️  Next trade in ${(delay / 1000).toFixed(0)} seconds...\n`);
        
        await new Promise(resolve => setTimeout(resolve, delay));

      } catch (error) {
        console.error('Bot error:', error);
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }
}

// Run the bot
const bot = new SimpleVolumeChurnBot();
bot.run().catch(console.error);