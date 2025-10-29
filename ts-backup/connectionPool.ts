// src/core/connectionPool.ts
import { Connection, ConnectionConfig } from '@solana/web3.js';
import { HELIUS_CONFIG } from '../config/helius.config';

export interface ConnectionPoolConfig {
  maxConnections: number;
  connectionTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  preferredEndpoint?: 'helius' | 'quicknode' | 'public';
}

export class ConnectionPool {
  private connections: Map<string, Connection> = new Map();
  private currentIndex: number = 0;
  private connectionOrder: string[] = [];
  private config: ConnectionPoolConfig;

  constructor(config: Partial<ConnectionPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 3,
      connectionTimeout: config.connectionTimeout || 60000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      preferredEndpoint: config.preferredEndpoint || 'helius',
      ...config
    };

    this.initializeConnections();
  }

  private initializeConnections(): void {
    // Priority order based on configuration
    const endpoints = this.getEndpointsByPriority();
    
    for (const [name, endpoint] of endpoints) {
      if (!endpoint) continue;
      
      try {
        const connectionConfig: ConnectionConfig = {
          commitment: 'confirmed',
          confirmTransactionInitialTimeout: this.config.connectionTimeout,
          httpHeaders: name === 'helius' ? HELIUS_CONFIG.CONNECTION_CONFIG.httpHeaders : undefined
        };
        
        const connection = new Connection(endpoint, connectionConfig);
        this.connections.set(name, connection);
        this.connectionOrder.push(name);
        
        console.log(`✅ Initialized ${name} connection`);
      } catch (error) {
        console.error(`❌ Failed to initialize ${name} connection:`, error);
      }
    }
    
    if (this.connections.size === 0) {
      throw new Error('No RPC connections could be established');
    }
  }

  private getEndpointsByPriority(): [string, string][] {
    const endpoints: [string, string][] = [
      ['helius', HELIUS_CONFIG.RPC_ENDPOINT],
      ['quicknode', process.env.QUICKNODE_RPC_URL || ''],
      ['public', 'https://api.mainnet-beta.solana.com']
    ];
    
    // Sort by preference
    if (this.config.preferredEndpoint === 'helius') {
      return endpoints;
    } else if (this.config.preferredEndpoint === 'quicknode') {
      return [endpoints[1], endpoints[0], endpoints[2]];
    } else {
      return [endpoints[2], endpoints[0], endpoints[1]];
    }
  }

  public getConnection(): Connection {
    const connectionName = this.connectionOrder[this.currentIndex];
    const connection = this.connections.get(connectionName);
    
    if (!connection) {
      throw new Error('No available connections');
    }
    
    // Round-robin for load balancing
    this.currentIndex = (this.currentIndex + 1) % this.connectionOrder.length;
    
    return connection;
  }
  
  public getHeliusConnection(): Connection {
    const helius = this.connections.get('helius');
    if (!helius) {
      throw new Error('Helius connection not available');
    }
    return helius;
  }
  
  public async testConnections(): Promise<void> {
    console.log('🔌 Testing all RPC connections...');
    
    for (const [name, connection] of this.connections) {
      try {
        const start = Date.now();
        const slot = await connection.getSlot();
        const latency = Date.now() - start;
        
        console.log(`✅ ${name}: Slot ${slot} (${latency}ms)`);
      } catch (error) {
        console.error(`❌ ${name}: Connection failed`, error);
      }
    }
  }
}