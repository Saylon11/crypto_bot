// src/core/bootstrap.ts
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';
import { ConnectionPool, ConnectionPoolConfig } from './connectionPool';
import { HELIUS_CONFIG } from '../config/helius.config';

// Load environment variables
dotenv.config();

/**
 * HootBot Bootstrap Configuration
 * Centralizes all system initialization
 */

export class ConnectionPool {
  private connections: Connection[] = [];
  private currentIndex: number = 0;
  private config: ConnectionPoolConfig;

  constructor(
    private rpcEndpoints: string[],
    config: Partial<ConnectionPoolConfig> = {}
  ) {
    this.config = {
      maxConnections: config.maxConnections || 3,
      connectionTimeout: config.connectionTimeout || 30000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      ...config
    };

    this.initializeConnections();
  }

  private initializeConnections(): void {
    for (const endpoint of this.rpcEndpoints) {
      const connection = new Connection(endpoint, {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: this.config.connectionTimeout
      });
      this.connections.push(connection);
    }
  }

  public getConnection(): Connection {
    const connection = this.connections[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.connections.length;
    return connection;
  }
}

/**
 * System configuration following HootBot principles
 */
export const HOOTBOT_CONFIG = {
  // RPC Configuration - Use proper Helius endpoint
  RPC_ENDPOINTS: [
    HELIUS_RPC,  // Primary: Helius Developer RPC
    process.env.QUICKNODE_RPC_URL || '',
    'https://api.mainnet-beta.solana.com'
  ].filter(url => url.length > 0),

  // Connection Pool Settings
  CONNECTION_POOL: {
    maxConnections: 3,
    connectionTimeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  } as ConnectionPoolConfig,

  // Trading Parameters
  TRADING: {
    MIN_TRADE_AMOUNT: 0.01,
    MAX_TRADE_AMOUNT: 10.0,
    DEFAULT_SLIPPAGE: 1.5,
    PRIORITY_FEE_LAMPORTS: 5000
  },

  // Human Behavior Parameters
  HUMAN_BEHAVIOR: {
    MIN_REACTION_TIME: 1000,  // 1 second
    MAX_REACTION_TIME: 5000,  // 5 seconds
    TYPING_SPEED_CPS: 5,      // Characters per second
    ERROR_RATE: 0.02          // 2% chance of "misclick"
  },

  // M.I.N.D. Integration
  MIND: {
    API_ENDPOINT: process.env.MIND_API_ENDPOINT || 'http://localhost:3000',
    POLLING_INTERVAL: 30000,  // 30 seconds
    MESSAGE_VERSION: '1.0.0'
  },

  // Token Configuration
  TOKENS: {
    DUTCHBROS: process.env.TARGET_TOKEN_MINT || '',
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    SOL: 'So11111111111111111111111111111111111111112'
  }
};

/**
 * Initialize connection pool
 */
export const connectionPool = new ConnectionPool(
  HOOTBOT_CONFIG.RPC_ENDPOINTS,
  HOOTBOT_CONFIG.CONNECTION_POOL
);

/**
 * Get primary connection
 */
export function getConnection(): Connection {
  return connectionPool.getConnection();
}

/**
 * Validate environment configuration
 */
export function validateEnvironment(): void {
  const required = [
    'WALLET_SECRET_KEY',
    'HELIUS_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  console.log('✅ Environment validation passed');
}

/**
 * Bootstrap the HootBot system
 */
export async function bootstrap(): Promise<void> {
  console.log('🚀 Bootstrapping HootBot...');
  
  // Validate environment
  validateEnvironment();
  
  // Test RPC connections
  console.log('🔌 Testing RPC connections...');
  const connection = getConnection();
  
  try {
    const version = await connection.getVersion();
    console.log('✅ RPC connection established:', version);
  } catch (error) {
    console.error('❌ RPC connection failed:', error);
    throw error;
  }
  
  console.log('✅ HootBot bootstrap complete');
}