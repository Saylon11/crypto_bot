// HootBot/src/pumpTools/enhancedTradeExecutor.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { decodeHootBotKeypair } from '../utils/phantomUtils';
import { executeBuy } from './tradeExecutor';

dotenv.config();

export class EnhancedTradeExecutor {
  private connection: Connection;
  private wallet: Keypair;
  
  constructor() {
    // Initialize Helius connection if available, otherwise use public RPC
    const heliusKey = process.env.HELIUS_API_KEY;
    if (heliusKey && heliusKey !== 'your_key' && heliusKey !== '') {
      this.connection = new Connection(
        `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
        'confirmed'
      );
      console.log('✅ Helius Professional connected');
    } else {
      this.connection = new Connection(
        'https://api.mainnet-beta.solana.com',
        'confirmed'
      );
      console.log('⚠️  Using public RPC (may be rate limited)');
    }
    
    // Load wallet
    this.wallet = decodeHootBotKeypair();
  }
  
  async executeBuy(tokenMint: string, amountSol: number): Promise<string | null> {
    try {
      console.log(`🚀 Enhanced Buy Execution`);
      console.log(`   Token: ${tokenMint}`);
      console.log(`   Amount: ${amountSol} SOL`);
      console.log(`   Using: ${process.env.HELIUS_API_KEY ? 'Helius Professional Features' : 'Public RPC'}`);
      
      // Use the existing working executeBuy function from tradeExecutor
      const result = await executeBuy(
        tokenMint,
        amountSol,
        this.wallet,
        this.connection,
        true // Skip MIND analysis for direct testing
      );
      
      if (result.success && result.signature) {
        console.log(`\n✅ Enhanced buy successful!`);
        console.log(`   TX: https://solscan.io/tx/${result.signature}`);
        if (result.tokensReceived) {
          console.log(`   Tokens received: ~${(result.tokensReceived / LAMPORTS_PER_SOL).toFixed(2)}`);
        }
        return result.signature;
      } else {
        console.log(`\n❌ Buy execution failed: ${result.error}`);
        return null;
      }
      
    } catch (error) {
      console.error(`\n❌ Buy execution failed:`, error instanceof Error ? error.message : String(error));
      
      // Add helpful error messages
      if (error instanceof Error) {
        if (error.message.includes('Insufficient')) {
          console.log('💡 Make sure your wallet has enough SOL for the trade + fees');
        } else if (error.message.includes('Not enough tokens')) {
          console.log('💡 Try a smaller amount - the token may have low liquidity');
        }
      }
      
      return null;
    }
  }
  
  async executeSell(tokenMint: string, percentage: number): Promise<string | null> {
    console.log(`\n🔴 Sell execution not implemented yet`);
    console.log(`   Token: ${tokenMint}`);
    console.log(`   Percentage: ${percentage}%`);
    console.log(`   Please use Phantom wallet or Raydium.io to sell`);
    return null;
  }
  
  async getBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to get balance:', error);
      return 0;
    }
  }
  
  async checkTokenBalance(tokenMint: string): Promise<number> {
    try {
      const tokenAccounts = await this.connection.getTokenAccountsByOwner(
        this.wallet.publicKey,
        { mint: new PublicKey(tokenMint) }
      );
      
      if (tokenAccounts.value.length === 0) {
        return 0;
      }
      
      const balance = await this.connection.getTokenAccountBalance(
        tokenAccounts.value[0].pubkey
      );
      
      return parseFloat(balance.value.uiAmount || '0');
    } catch (error) {
      console.error('Failed to check token balance:', error);
      return 0;
    }
  }
}

// Export a singleton instance
let executorInstance: EnhancedTradeExecutor | null = null;

export function getEnhancedExecutor(): EnhancedTradeExecutor {
  if (!executorInstance) {
    executorInstance = new EnhancedTradeExecutor();
  }
  return executorInstance;
}

// Direct test function
export async function testEnhancedBuy(tokenMint: string, amountSol: number): Promise<void> {
  const executor = getEnhancedExecutor();
  
  console.log(`\n💰 Wallet balance: ${(await executor.getBalance()).toFixed(4)} SOL`);
  
  const signature = await executor.executeBuy(tokenMint, amountSol);
  
  if (signature) {
    console.log(`\n🎉 Trade successful!`);
    console.log(`🔗 View on Solscan: https://solscan.io/tx/${signature}`);
    
    // Check token balance after a delay
    setTimeout(async () => {
      const tokenBalance = await executor.checkTokenBalance(tokenMint);
      console.log(`\n📊 Token balance: ${tokenBalance.toFixed(2)} tokens`);
    }, 5000);
  }
}