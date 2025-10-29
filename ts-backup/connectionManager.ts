import { Connection } from '@solana/web3.js';

export interface ConnectionPoolConfig {
  primary: string;
  fallbacks: string[];
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
}

export class ConnectionManager {
  private connection: Connection;
  
  constructor(config: ConnectionPoolConfig) {
    this.connection = new Connection(config.primary, 'confirmed');
  }
  
  getConnection(): Connection {
    return this.connection;
  }
  
  async executeWithRetry<T>(
    operation: (connection: Connection) => Promise<T>,
    operationName: string
  ): Promise<T> {
    try {
      return await operation(this.connection);
    } catch (error) {
      console.error(`Operation ${operationName} failed:`, error);
      throw error;
    }
  }
  
  destroy(): void {
    // Cleanup
  }
}

let connectionManager: ConnectionManager | null = null;

export function initializeConnectionManager(config: ConnectionPoolConfig): ConnectionManager {
  if (!connectionManager) {
    connectionManager = new ConnectionManager(config);
  }
  return connectionManager;
}

export function getConnectionManager(): ConnectionManager {
  if (!connectionManager) {
    throw new Error('ConnectionManager not initialized');
  }
  return connectionManager;
}
