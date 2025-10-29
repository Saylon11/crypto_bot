// src/config/helius.config.ts
/**
 * Helius Configuration for HootBot
 * Optimized for Developer Plan (10M credits)
 */

export const HELIUS_CONFIG = {
  // Primary Helius RPC endpoint
  RPC_ENDPOINT: `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
  
  // Helius API endpoints
  API_BASE_URL: 'https://api.helius.xyz/v0',
  
  // Rate limiting configuration for Developer plan
  RATE_LIMITS: {
    RPC_REQUESTS_PER_SECOND: 3000,  // Developer plan limit
    API_REQUESTS_PER_SECOND: 100,    // API calls limit
    BURST_CAPACITY: 5000,            // Burst capacity
    CREDITS_PER_RPC_CALL: 1,         // Credit cost per RPC call
    CREDITS_PER_API_CALL: 10         // Credit cost per API call
  },
  
  // Connection configuration
  CONNECTION_CONFIG: {
    commitment: 'confirmed' as const,
    wsEndpoint: `wss://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`,
    confirmTransactionInitialTimeout: 60000,
    httpHeaders: {
      'Content-Type': 'application/json',
    }
  },
  
  // Webhook configuration for real-time data
  WEBHOOK_CONFIG: {
    enabled: true,
    types: ['TRANSFER', 'SWAP', 'NFT_SALE'],
    accountsToTrack: [
      process.env.HOOTBOT_WALLET_ADDRESS!,
      process.env.TARGET_TOKEN_MINT!
    ]
  }
};