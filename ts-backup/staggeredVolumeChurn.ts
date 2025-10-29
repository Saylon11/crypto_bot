// HootBot/src/bots/volume/staggeredVolumeChurn.ts
import { Connection, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

// Your existing wallet configuration
const DISTRIBUTION_WALLETS = {
  WHALE_1: process.env.WHALE_WALLET_1!,
  WHALE_2: process.env.WHALE_WALLET_2!,
  DOLPHIN_1: process.env.DOLPHIN_WALLET_1!,
  DOLPHIN_2: process.env.DOLPHIN_WALLET_2!,
  FISH_1: process.env.FISH_WALLET_1!
};

class StaggeredVolumeChurnBot {
  private connection: Connection;
  private wallets: Map<string, { keypair: Keypair; type: string; lastBuy: number; lastSell: number }> = new Map();
  private tokenMint: string;
  private totalBuyVolume: number = 0;
  private totalSellVolume: number = 0;
  private targetBuyBias: number = 1.03; // 3% more buys than sells

  constructor() {
    this.connection = new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
      'confirmed'
    );
    this.tokenMint = process.env.FATBEAR_TOKEN_MINT!;
    this.loadWallets();
    
    console.log('🦉 Staggered Volume Churn Bot');
    console.log(`📊 Token: ${this.tokenMint}`);
    console.log(`💼 ${this.wallets.size} wallets loaded`);
    console.log(`🎯 Target: ${((this.targetBuyBias - 1) * 100).toFixed(0)}% positive pressure\n`);
  }

  private loadWallets() {
    Object.entries(DISTRIBUTION_WALLETS).forEach(([name, keyString]) => {
      const keypair = Keypair.fromSecretKey(bs58.decode(keyString));
      this.wallets.set(keypair.publicKey.toString(), {
        keypair,
        type: name,
        lastBuy: 0,
        lastSell: 0
      });
    });
  }

  private async executeSwap(wallet: Keypair, amountSol: number, isBuy: boolean) {
    const inputMint = isBuy ? 'So11111111111111111111111111111111111111112' : this.tokenMint;
    const outputMint = isBuy ? this.tokenMint : 'So11111111111111111111111111111111111111112';
    
    // Calculate the correct amount based on decimals
    let inputAmount: number;
    if (isBuy) {
      // Buying: input is SOL (9 decimals)
      inputAmount = Math.floor(amountSol * LAMPORTS_PER_SOL);
    } else {
      // Selling: need to calculate token amount that equals ~amountSol worth
      // First get a quote to see current price
      const priceCheckResponse = await fetch(
        `https://quote-api.jup.ag/v6/quote?` +
        `inputMint=So11111111111111111111111111111111111111112&` +
        `outputMint=${this.tokenMint}&` +
        `amount=${LAMPORTS_PER_SOL}&` + // 1 SOL
        `slippageBps=100`
      );
      const priceData = await priceCheckResponse.json();
      const tokensPerSol = Number(priceData.outAmount); // tokens you get for 1 SOL (with 6 decimals)
      
      // Calculate how many tokens to sell for desired SOL amount
      const tokensToSell = (tokensPerSol * amountSol);
      inputAmount = Math.floor(tokensToSell);
    }
    
    // Get quote
    const quoteResponse = await fetch(
      `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=${inputMint}&` +
      `outputMint=${outputMint}&` +
      `amount=${inputAmount}&` +
      `slippageBps=100`
    );

    const quoteData = await quoteResponse.json();
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
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

    const { swapTransaction } = await swapResponse.json();
    const transaction = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'));
    
    transaction.sign([wallet]);
    const signature = await this.connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: true, maxRetries: 2 }
    );

    await this.connection.confirmTransaction(signature, 'confirmed');
    return signature;
  }

  async run() {
    console.log('\n🚀 Starting staggered volume generation...\n');

    while (true) {
      // Pick a random wallet
      const walletEntries = Array.from(this.wallets.entries());
      const [address, walletInfo] = walletEntries[Math.floor(Math.random() * walletEntries.length)];
      
      const now = Date.now();
      const timeSinceLastBuy = now - walletInfo.lastBuy;
      const timeSinceLastSell = now - walletInfo.lastSell;
      
      // Minimum 5 minutes between any trade from same wallet
      const minWalletCooldown = 5 * 60 * 1000;
      
      // Decide action based on cooldowns AND buy/sell balance
      let action: 'buy' | 'sell' | 'skip' = 'skip';
      
      if (timeSinceLastBuy > minWalletCooldown && timeSinceLastSell > minWalletCooldown) {
        // Calculate current buy/sell ratio
        const totalVolume = this.totalBuyVolume + this.totalSellVolume;
        
        // For the first few trades, heavily favor buys to establish positive pressure
        if (totalVolume < 1.0) { // First 1 SOL of volume
          action = Math.random() < 0.7 ? 'buy' : 'sell'; // 70% buy rate to start
        } else {
          const currentBuyRatio = this.totalBuyVolume / totalVolume;
          const targetBuyRatio = this.targetBuyBias / (1 + this.targetBuyBias); // ~0.507 for 3% bias
          
          // More aggressive correction when below target
          if (currentBuyRatio < targetBuyRatio) {
            // Below target - need more buys
            const deficit = targetBuyRatio - currentBuyRatio;
            // Buy probability increases with deficit (80-95% buy rate when behind)
            const buyProbability = Math.min(0.95, 0.8 + deficit * 3);
            action = Math.random() < buyProbability ? 'buy' : 'sell';
          } else {
            // At or above target - can allow more sells but maintain bias
            action = Math.random() < 0.52 ? 'buy' : 'sell'; // Still 52% buy rate
          }
        }
        
        // Override: If net pressure is negative, force buys
        const netPressure = this.totalBuyVolume - this.totalSellVolume;
        if (netPressure < 0 && Math.random() < 0.9) {
          action = 'buy'; // 90% chance to force buy when in deficit
        }
      }
      
      if (action !== 'skip') {
        try {
          // Random amount between 0.02 and 0.15 SOL (smaller for low liquidity)
          const amount = 0.02 + Math.random() * 0.13;
          
          console.log(`\n${action === 'buy' ? '🟢 BUY' : '🔴 SELL'}`);
          console.log(`👛 ${walletInfo.type}: ${address.slice(0, 8)}...`);
          
          const signature = await this.executeSwap(walletInfo.keypair, amount, action === 'buy');
          
          // Update last action time and volume tracking
          if (action === 'buy') {
            walletInfo.lastBuy = now;
            this.totalBuyVolume += amount;
            console.log(`💰 Bought ~${amount.toFixed(3)} SOL worth of FATBEAR`);
          } else {
            walletInfo.lastSell = now;
            this.totalSellVolume += amount;
            console.log(`💰 Sold FATBEAR for ~${amount.toFixed(3)} SOL`);
          }
          
          console.log(`✅ TX: ${signature.slice(0, 8)}...`);
          
          // Show volume stats periodically
          const totalVolume = this.totalBuyVolume + this.totalSellVolume;
          if (totalVolume > 0 && Math.random() < 0.2) { // 20% chance to show stats
            const buyPercentage = (this.totalBuyVolume / totalVolume * 100).toFixed(1);
            const pressure = ((this.totalBuyVolume - this.totalSellVolume) / totalVolume * 100).toFixed(1);
            console.log(`📊 Stats: ${buyPercentage}% buys | ${pressure}% net pressure`);
          }
          
          // Wait 30-90 seconds before next trade
          const delay = (30 + Math.random() * 60) * 1000;
          console.log(`⏱️  Next trade in ${(delay / 1000).toFixed(0)}s`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (error: any) {
          console.error(`❌ Trade failed:`, error.message || error);
          // On error, wait 30 seconds
          await new Promise(resolve => setTimeout(resolve, 30000));
        }
      } else {
        // No wallet available, wait 10 seconds and try again
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }
}

const bot = new StaggeredVolumeChurnBot();
bot.run().catch(console.error);