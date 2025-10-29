// HootBot/src/utils/heliusConnection.ts

import { 
  Connection, 
  ConnectionConfig, 
  Commitment,
  PublicKey,
  Transaction,
  TransactionSignature,
  Keypair,
  SendOptions
} from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration constants
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_BASE_URL = 'https://mainnet.helius-rpc.com';
const HELIUS_SECURE_URL = process.env.HELIUS_SECURE_RPC_URL || 'https://agatha-g1f8qi-fast-mainnet.helius-rpc.com';
const HELIUS_SENDER_URL = 'https://mainnet.helius-rpc.com/sender';
const PUBLIC_RPC_URL = 'https://api.mainnet-beta.solana.com';
const MAX_RETRIES = 5;
const INITIAL_RETRY_DELAY = 500;

// Cache configuration
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30000; // 30 seconds

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > this.DEFAULT_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Enhanced Helius Connection class
export class HeliusConnection extends Connection {
  private cache = new RequestCache();
  private senderEndpoint: string;
  private wsConnection: Connection | null = null;
  private isUsingFallback: boolean = false;

  constructor(commitment: Commitment = 'confirmed') {
    // Use the Secure RPC URL that works!
    const SECURE_URL = 'https://agatha-g1f8qi-fast-mainnet.helius-rpc.com';
    
    // Determine endpoint and config first
    const endpoint = HELIUS_API_KEY ? SECURE_URL : PUBLIC_RPC_URL;
    const wsEndpoint = HELIUS_API_KEY 
      ? `wss://atlas-mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`
      : undefined;
    
    const config: ConnectionConfig = {
      commitment,
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint
    };

    // Call super with determined endpoint
    super(endpoint, config);
    
    // Set properties after super
    if (!HELIUS_API_KEY) {
      console.warn('⚠️ HELIUS_API_KEY not found, using public RPC');
      this.senderEndpoint = PUBLIC_RPC_URL;
      this.isUsingFallback = true;
    } else {
      this.senderEndpoint = SECURE_URL;
      this.isUsingFallback = false;
      // Test connection asynchronously
      this.testConnection();
    }
  }

  // Test connection and fall back if needed
  private async testConnection(): Promise<void> {
    try {
      await this.getSlot();
      console.log('✅ Helius Professional connected');
    } catch (error: any) {
      console.warn('⚠️ Helius connection failed:', error.message);
      console.log('💡 Please check:');
      console.log('   1. Your IP is whitelisted in Helius dashboard');
      console.log('   2. Your API key is valid');
      console.log('   3. You have credits remaining');
      
      // Note: We can't change the connection after construction,
      // but at least we know it's not working
      this.isUsingFallback = true;
    }
  }

  // Get dynamic priority fee
  async getDynamicPriorityFee(accountKeys?: PublicKey[]): Promise<number> {
    try {
      const cacheKey = `priority_fee_${accountKeys?.map(k => k.toBase58()).join('_') || 'default'}`;
      const cached = this.cache.get<number>(cacheKey);
      if (cached !== null) return cached;

      // Only use priority fee API if on Helius
      if (this.isUsingFallback || !HELIUS_API_KEY) {
        return 0.0005; // Default for public RPC
      }

      const response = await fetch(this.rpcEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getPriorityFeeEstimate',
          params: [{
            accountKeys: accountKeys?.map(k => k.toBase58()),
            options: { 
              includeAllPriorityFeeLevels: true,
              lookbackSlots: 150
            }
          }]
        })
      });

      const data = await response.json();
      
      if (data.error) {
        console.error('Priority fee error:', data.error);
        return 0.0005; // Default fallback
      }

      // Use "high" priority for HootBot's competitive advantage
      const fee = data.result?.priorityFeeLevels?.high || 0.0005;
      this.cache.set(cacheKey, fee);
      
      return fee;
    } catch (error) {
      console.error('Failed to get priority fee:', error);
      return 0.0005; // Default fallback
    }
  }

  // Send transaction with retry logic and exponential backoff
  async sendTransactionWithRetry(
    transaction: Transaction,
    signers: Keypair[],
    options?: SendOptions
  ): Promise<TransactionSignature> {
    let attempt = 0;
    let delay = INITIAL_RETRY_DELAY;
    let lastError: any;

    while (attempt < MAX_RETRIES) {
      try {
        // Add dynamic priority fee
        const priorityFee = await this.getDynamicPriorityFee(
          transaction.instructions.flatMap(ix => ix.keys.map(k => k.pubkey))
        );
        
        // Add compute unit price instruction if not already present
        if (!transaction.instructions.some(ix => 
          ix.programId.equals(new PublicKey('ComputeBudget111111111111111111111111111111'))
        )) {
          const computeBudgetIx = {
            programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
            keys: [],
            data: Buffer.concat([
              Buffer.from([3]), // SetComputeUnitPrice instruction
              Buffer.from(new Uint8Array(new BigUint64Array([BigInt(priorityFee * 1_000_000)]).buffer))
            ])
          };
          transaction.add(computeBudgetIx);
        }

        // Sign transaction
        transaction.sign(...signers);

        // Use sender endpoint for better propagation
        const signature = await this.sendRawTransaction(
          transaction.serialize(),
          {
            skipPreflight: options?.skipPreflight ?? false,
            preflightCommitment: options?.preflightCommitment ?? 'confirmed',
            maxRetries: 2
          }
        );

        console.log(`✅ Transaction sent: ${signature}`);
        return signature;

      } catch (error: any) {
        lastError = error;
        attempt++;
        
        if (attempt >= MAX_RETRIES) {
          console.error(`❌ Max retries exceeded:`, error);
          throw error;
        }

        // Check if error is retryable
        const isRetryable = this.isRetryableError(error);
        if (!isRetryable) {
          throw error;
        }

        console.log(`⚠️ Retry ${attempt}/${MAX_RETRIES} after ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // Exponential backoff with jitter
        delay = Math.min(delay * 2 + Math.random() * 1000, 30000);

        // Refresh blockhash on retry
        const { blockhash } = await this.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
      }
    }

    throw lastError;
  }

  // Check if error is retryable
  private isRetryableError(error: any): boolean {
    const errorMessage = error.message?.toLowerCase() || '';
    
    // Non-retryable errors
    if (errorMessage.includes('insufficient funds')) return false;
    if (errorMessage.includes('invalid instruction')) return false;
    if (errorMessage.includes('account does not exist')) return false;
    
    // Retryable errors
    if (errorMessage.includes('blockhash not found')) return true;
    if (errorMessage.includes('timeout')) return true;
    if (errorMessage.includes('429')) return true; // Rate limit
    if (errorMessage.includes('503')) return true; // Service unavailable
    if (errorMessage.includes('network')) return true;
    
    // Default to retry for unknown errors
    return true;
  }

  // Batch RPC requests for efficiency
  async batchRequest<T>(requests: Array<{
    method: string;
    params?: any[];
  }>): Promise<T[]> {
    const batchPayload = requests.map((req, index) => ({
      jsonrpc: '2.0',
      id: index,
      method: req.method,
      params: req.params || []
    }));

    const response = await fetch(this.rpcEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batchPayload)
    });

    const results = await response.json();
    return results.map((r: any) => r.result);
  }

  // Get multiple accounts efficiently
  async getMultipleAccountsInfoEfficient(
    publicKeys: PublicKey[],
    commitment?: Commitment
  ): Promise<any[]> {
    // Check cache first
    const uncachedKeys: PublicKey[] = [];
    const cachedResults = new Map<string, any>();

    for (const key of publicKeys) {
      const cached = this.cache.get<any>(key.toBase58());
      if (cached) {
        cachedResults.set(key.toBase58(), cached);
      } else {
        uncachedKeys.push(key);
      }
    }

    if (uncachedKeys.length === 0) {
      return publicKeys.map(key => cachedResults.get(key.toBase58()));
    }

    // Batch fetch uncached accounts
    const batchSize = 100; // Helius supports up to 100 accounts per request
    const batches: PublicKey[][] = [];
    
    for (let i = 0; i < uncachedKeys.length; i += batchSize) {
      batches.push(uncachedKeys.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => 
        super.getMultipleAccountsInfo(batch, commitment)
      )
    );

    // Flatten results and update cache
    const flatResults = results.flat();
    uncachedKeys.forEach((key, index) => {
      if (flatResults[index]) {
        this.cache.set(key.toBase58(), flatResults[index]);
      }
    });

    // Combine cached and fresh results in original order
    return publicKeys.map(key => {
      const cached = cachedResults.get(key.toBase58());
      if (cached) return cached;
      
      const index = uncachedKeys.findIndex(k => k.equals(key));
      return flatResults[index];
    });
  }

  // WebSocket subscription management
  async subscribeToAccount(
    publicKey: PublicKey,
    callback: (accountInfo: any) => void,
    commitment?: Commitment
  ): Promise<number> {
    return this.onAccountChange(publicKey, callback, commitment);
  }

  // Enhanced transaction confirmation with timeout
  async confirmTransactionWithTimeout(
    signature: TransactionSignature,
    commitment?: Commitment,
    timeoutMs: number = 30000
  ): Promise<boolean> {
    const start = Date.now();
    
    while (Date.now() - start < timeoutMs) {
      const status = await this.getSignatureStatus(signature);
      
      if (status.value?.confirmationStatus === commitment || 
          status.value?.confirmationStatus === 'finalized') {
        return true;
      }
      
      if (status.value?.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Transaction confirmation timeout after ${timeoutMs}ms`);
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Check if using fallback
  isUsingPublicRPC(): boolean {
    return this.isUsingFallback;
  }
}

// Create a wrapper that provides a fallback connection
class ConnectionWrapper {
  private heliusConnection: HeliusConnection | null = null;
  private publicConnection: Connection | null = null;
  private initPromise: Promise<void> | null = null;

  private async initialize(): Promise<void> {
    if (this.heliusConnection) return;

    try {
      this.heliusConnection = new HeliusConnection('confirmed');
      // Give it a moment to test the connection
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to initialize Helius connection:', error);
      this.publicConnection = new Connection(PUBLIC_RPC_URL, 'confirmed');
    }
  }

  private ensureInitialized(): Connection {
    // If we have a connection, return it
    if (this.heliusConnection) return this.heliusConnection;
    if (this.publicConnection) return this.publicConnection;

    // Initialize synchronously with public RPC as fallback
    try {
      this.heliusConnection = new HeliusConnection('confirmed');
      return this.heliusConnection;
    } catch (error) {
      console.warn('Using public RPC fallback');
      this.publicConnection = new Connection(PUBLIC_RPC_URL, 'confirmed');
      return this.publicConnection;
    }
  }

  getConnection(): HeliusConnection {
    const conn = this.ensureInitialized();
    
    // If it's a regular Connection, wrap it with HeliusConnection interface
    if (!(conn instanceof HeliusConnection)) {
      // Create a minimal wrapper
      const wrapper = Object.create(HeliusConnection.prototype);
      Object.assign(wrapper, conn);
      wrapper.isUsingPublicRPC = () => true;
      wrapper.getDynamicPriorityFee = async () => 0.0005;
      wrapper.sendTransactionWithRetry = async (tx: Transaction, signers: Keypair[]) => {
        return conn.sendTransaction(tx, signers);
      };
      wrapper.getMultipleAccountsInfoEfficient = async (keys: PublicKey[]) => {
        return conn.getMultipleAccountsInfo(keys);
      };
      wrapper.confirmTransactionWithTimeout = async (sig: string) => {
        const result = await conn.confirmTransaction(sig);
        return !result.value.err;
      };
      wrapper.clearCache = () => {};
      wrapper.cache = new RequestCache();
      return wrapper as HeliusConnection;
    }
    
    return conn as HeliusConnection;
  }
}

// Singleton wrapper instance
const connectionWrapper = new ConnectionWrapper();

// Synchronous getter that always works
export function getHeliusConnection(): HeliusConnection {
  return connectionWrapper.getConnection();
}

// Export convenience functions
export async function sendTransactionSafe(
  transaction: Transaction,
  signers: Keypair[],
  options?: SendOptions
): Promise<TransactionSignature> {
  const connection = getHeliusConnection();
  return connection.sendTransactionWithRetry(transaction, signers, options);
}

export async function getDynamicPriorityFee(accountKeys?: PublicKey[]): Promise<number> {
  const connection = getHeliusConnection();
  return connection.getDynamicPriorityFee(accountKeys);
}