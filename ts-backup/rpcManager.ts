// HootBot/src/utils/rpcManager.ts
import { Connection, ConnectionConfig } from '@solana/web3.js';

interface RPCEndpoint {
  url: string;
  weight: number;
  failures: number;
  lastUsed: number;
}

interface RPCManagerConfig {
  endpoints: string[];
  maxRequestsPerSecond: number;
  backoffMultiplier: number;
  maxRetries: number;
  endpointTimeout: number;
}

export class RPCManager {
  private endpoints: RPCEndpoint[];
  private requestQueue: Array<{
    execute: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  
  constructor(private config: RPCManagerConfig) {
    this.endpoints = config.endpoints.map(url => ({
      url,
      weight: 1.0,
      failures: 0,
      lastUsed: 0
    }));
  }

  /**
   * Get a connection with automatic failover
   */
  getConnection(): Connection {
    const endpoint = this.selectEndpoint();
    return new Connection(endpoint.url, 'confirmed');
  }

  /**
   * Execute RPC request with rate limiting and retry logic
   */
  async executeRequest<T>(
    fn: (connection: Connection) => Promise<T>
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        execute: () => this.executeWithRetry(fn),
        resolve,
        reject
      });
      
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift()!;
      
      // Rate limiting
      const minInterval = 1000 / this.config.maxRequestsPerSecond;
      const elapsed = Date.now() - this.lastRequestTime;
      
      if (elapsed < minInterval) {
        await this.sleep(minInterval - elapsed);
      }
      
      this.lastRequestTime = Date.now();
      
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Execute with retry and endpoint rotation
   */
  private async executeWithRetry<T>(
    fn: (connection: Connection) => Promise<T>
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      const endpoint = this.selectEndpoint();
      const connection = new Connection(endpoint.url, 'confirmed');
      
      try {
        const result = await fn(connection);
        
        // Success - improve endpoint weight
        endpoint.failures = 0;
        endpoint.weight = Math.min(endpoint.weight * 1.1, 2.0);
        endpoint.lastUsed = Date.now();
        
        return result;
      } catch (error: any) {
        lastError = error;
        
        // Handle rate limiting
        if (error.message?.includes('429') || error.message?.includes('Too many requests')) {
          endpoint.failures++;
          endpoint.weight = Math.max(endpoint.weight * 0.5, 0.1);
          
          const backoffTime = Math.min(
            1000 * Math.pow(this.config.backoffMultiplier, attempt),
            30000
          );
          
          console.log(`⚠️ Rate limited on ${endpoint.url}, backing off ${backoffTime}ms`);
          await this.sleep(backoffTime);
        } else {
          endpoint.failures++;
          endpoint.weight = Math.max(endpoint.weight * 0.8, 0.2);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Select endpoint based on weighted random selection
   */
  private selectEndpoint(): RPCEndpoint {
    const now = Date.now();
    const availableEndpoints = this.endpoints.filter(
      ep => now - ep.lastUsed > 1000
    );
    
    if (availableEndpoints.length === 0) {
      return this.endpoints.sort((a, b) => a.lastUsed - b.lastUsed)[0];
    }
    
    const totalWeight = availableEndpoints.reduce((sum, ep) => sum + ep.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const endpoint of availableEndpoints) {
      random -= endpoint.weight;
      if (random <= 0) {
        return endpoint;
      }
    }
    
    return availableEndpoints[0];
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const rpcManager = new RPCManager({
  endpoints: [
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
    process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'https://api.mainnet-beta.solana.com'
  ].filter(url => url && url !== ''),
  maxRequestsPerSecond: 2,
  backoffMultiplier: 2,
  maxRetries: 3,
  endpointTimeout: 30000
});