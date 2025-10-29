// src/utils/apiClient.ts
import axios from 'axios';
import { WalletData } from '../types';
import { HELIUS_CONFIG } from '../config/helius.config';

const heliusApi = axios.create({
  baseURL: HELIUS_CONFIG.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Rate limiter for Helius API
class RateLimiter {
  private requests: number[] = [];
  private readonly windowMs = 1000; // 1 second window
  private readonly maxRequests: number;

  constructor(maxRequestsPerSecond: number) {
    this.maxRequests = maxRequestsPerSecond;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 10; // Add 10ms buffer
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

const apiRateLimiter = new RateLimiter(HELIUS_CONFIG.RATE_LIMITS.API_REQUESTS_PER_SECOND);

export async function fetchBehaviorFromHelius(
  tokenOrWallet: string,
  limit: number = 100
): Promise<WalletData[]> {
  try {
    await apiRateLimiter.waitIfNeeded();
    
    console.log(`📡 Fetching Helius data for ${tokenOrWallet}`);
    
    // Enhanced endpoint with pagination support
    const response = await heliusApi.post('/addresses/transactions', {
      addresses: [tokenOrWallet],
      options: {
        limit,
        showNativeTransfers: true,
        parseTransactions: true,
        encoding: 'jsonParsed'
      }
    }, {
      params: {
        'api-key': process.env.HELIUS_API_KEY
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      console.warn('⚠️ No data received from Helius');
      return [];
    }

    // Parse transactions into WalletData format
    const walletData: WalletData[] = response.data
      .filter((tx: any) => tx.type === 'SWAP' || tx.type === 'TRANSFER')
      .map((tx: any) => ({
        walletAddress: tx.from || 'unknown',
        amount: tx.amount || 0,
        type: tx.type === 'SWAP' ? 
          (tx.tokenAmount > 0 ? 'buy' : 'sell') : 
          (tx.amount > 0 ? 'buy' : 'sell'),
        timestamp: tx.timestamp * 1000
      }));

    console.log(`✅ Fetched ${walletData.length} transactions from Helius`);
    return walletData;
    
  } catch (error: any) {
    if (error.response?.status === 429) {
      console.error('🚨 Rate limit exceeded - waiting before retry');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return fetchBehaviorFromHelius(tokenOrWallet, limit); // Retry
    }
    
    console.error('🚨 Helius API error:', error.message);
    return [];
  }
}

export async function fetchTokenHolders(
  tokenMint: string
): Promise<any[]> {
  try {
    await apiRateLimiter.waitIfNeeded();
    
    console.log(`📡 Fetching token holders for ${tokenMint}`);
    
    const response = await heliusApi.post('/token-metadata', {
      mintAccounts: [tokenMint],
      includeHolders: true,
      includeMetadata: true
    }, {
      params: {
        'api-key': process.env.HELIUS_API_KEY
      }
    });

    return response.data || [];
    
  } catch (error: any) {
    console.error('🚨 Error fetching token holders:', error.message);
    return [];
  }
}

// Export enhanced version compatibility
export {
  fetchBehaviorFromHelius as fetchBehaviorFromHeliusEnhanced,
  fetchTokenHolders as fetchTokenHoldersEnhanced
};