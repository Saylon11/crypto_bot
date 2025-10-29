// HootBot/src/utils/jupiterSwap.ts
import { 
  Connection, 
  PublicKey, 
  Transaction,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction
} from '@solana/web3.js';
import axios from 'axios';
import fetch from 'node-fetch';

const JUPITER_API_URL = 'https://quote-api.jup.ag/v6';
const FATBEAR_MINT = process.env.FATBEAR_TOKEN_MINT || process.env.TARGET_TOKEN_MINT;
const WSOL_MINT = 'So11111111111111111111111111111111111111112';

interface JupiterQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee?: any;
  priceImpactPct: string;
  routePlan: any[];
}

interface SwapResult {
  success: boolean;
  signature?: string;
  error?: string;
  inAmount?: number;
  outAmount?: number;
  priceImpact?: number;
}

export class JupiterSwapManager {
  private connection: Connection;

  constructor() {
    const rpcUrl = process.env.HELIUS_RPC_URL || process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Execute a real swap through Jupiter
   */
  async executeSwap(
    wallet: Keypair,
    direction: 'buy' | 'sell',
    amountSOL: number,
    slippageBps: number = 50 // 0.5% default
  ): Promise<SwapResult> {
    try {
      console.log(`🔄 Preparing ${direction} swap for ${amountSOL} SOL...`);
      
      // Set up mints based on direction
      const inputMint = direction === 'buy' ? WSOL_MINT : FATBEAR_MINT;
      const outputMint = direction === 'buy' ? FATBEAR_MINT : WSOL_MINT;
      
      // Calculate input amount
      let inputAmount: string;
      if (direction === 'buy') {
        // Buying with SOL
        const lamports = Math.floor(amountSOL * 1e9);
        inputAmount = lamports.toString();
      } else {
        // Selling tokens - need to calculate token amount
        const price = await this.getCurrentPrice();
        const tokenAmount = Math.floor(amountSOL / price * 1e6); // Assuming 6 decimals
        inputAmount = tokenAmount.toString();
      }
      
      // Get quote from Jupiter
      console.log('📊 Getting quote from Jupiter...');
      const quoteResponse = await fetch(
        `${JUPITER_API_URL}/quote?` + new URLSearchParams({
          inputMint,
          outputMint,
          amount: inputAmount,
          slippageBps: slippageBps.toString(),
          onlyDirectRoutes: 'false',
          asLegacyTransaction: 'false'
        })
      );
      
      if (!quoteResponse.ok) {
        throw new Error(`Failed to get quote: ${await quoteResponse.text()}`);
      }
      
      const quoteData: JupiterQuote = await quoteResponse.json();
      
      // Check price impact
      const priceImpact = parseFloat(quoteData.priceImpactPct);
      console.log(`📊 Price Impact: ${priceImpact.toFixed(3)}%`);
      
      if (priceImpact > 2) {
        console.warn(`⚠️ High price impact: ${priceImpact.toFixed(2)}%`);
        if (priceImpact > 5) {
          return {
            success: false,
            error: `Price impact too high: ${priceImpact.toFixed(2)}%`,
            priceImpact
          };
        }
      }
      
      // Get swap transaction
      console.log('🔄 Getting swap transaction...');
      const swapResponse = await fetch(`${JUPITER_API_URL}/swap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quoteResponse: quoteData,
          userPublicKey: wallet.publicKey.toString(),
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          // Remove the conflicting parameters - use only prioritizationFeeLamports
          prioritizationFeeLamports: 1000000 // 0.001 SOL priority fee
        })
      });
      
      if (!swapResponse.ok) {
        throw new Error(`Failed to get swap transaction: ${await swapResponse.text()}`);
      }
      
      const swapData = await swapResponse.json();
      const { swapTransaction } = swapData;
      
      // Deserialize and sign the transaction
      console.log('✍️ Signing transaction...');
      const swapTransactionBuf = Buffer.from(swapTransaction, 'base64');
      const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
      transaction.sign([wallet]);
      
      // Send transaction
      console.log('📡 Sending transaction...');
      const rawTransaction = transaction.serialize();
      const signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
        maxRetries: 2
      });
      
      console.log(`⏳ Waiting for confirmation...`);
      const latestBlockhash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, 'confirmed');
      
      console.log(`✅ Transaction confirmed!`);
      console.log(`🔗 Signature: ${signature}`);
      
      return {
        success: true,
        signature,
        inAmount: parseInt(inputAmount),
        outAmount: parseInt(quoteData.outAmount),
        priceImpact
      };
      
    } catch (error: any) {
      console.error(`❌ Swap failed:`, error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get current $FATBEAR price from Jupiter
   */
  async getCurrentPrice(): Promise<number> {
    try {
      // Get quote for 1 SOL to determine price
      const response = await fetch(
        `${JUPITER_API_URL}/quote?` + new URLSearchParams({
          inputMint: WSOL_MINT,
          outputMint: FATBEAR_MINT,
          amount: '1000000000', // 1 SOL
          slippageBps: '50'
        })
      );
      
      if (!response.ok) {
        throw new Error('Failed to get price quote');
      }
      
      const quote: JupiterQuote = await response.json();
      const solAmount = 1;
      const tokenAmount = parseInt(quote.outAmount) / 1e6; // Assuming 6 decimals
      const price = solAmount / tokenAmount;
      
      return price;
    } catch (error) {
      console.error('Failed to get current price:', error);
      return 0.046; // Fallback price
    }
  }

  /**
   * Check if a wallet has sufficient token balance
   */
  async checkTokenBalance(
    walletAddress: PublicKey,
    requiredAmount: number
  ): Promise<boolean> {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        walletAddress,
        { mint: new PublicKey(FATBEAR_MINT) }
      );
      
      if (tokenAccounts.value.length === 0) {
        console.log('No token account found');
        return false;
      }
      
      const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      return balance >= requiredAmount;
    } catch (error) {
      console.error('Failed to check token balance:', error);
      return false;
    }
  }
}

// Export singleton instance
export const jupiterSwap = new JupiterSwapManager();

// Helper function for the bot
export async function executeJupiterSwap(
  wallet: Keypair,
  direction: 'buy' | 'sell',
  amountSOL: number
): Promise<SwapResult> {
  return jupiterSwap.executeSwap(wallet, direction, amountSOL);
}