import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { Keypair } from '@solana/web3.js';

const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' });

export class SecureKeypairLoader {
  private static walletCache = new Map<string, Keypair>();

  static async loadWallet(secretName: string): Promise<Keypair> {
    // Check cache first
    if (this.walletCache.has(secretName)) {
      return this.walletCache.get(secretName)!;
    }

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await client.send(command);
      
      if (!response.SecretString) {
        throw new Error(`Secret ${secretName} has no value`);
      }

      const secretKey = JSON.parse(response.SecretString);
      const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
      
      // Cache for performance
      this.walletCache.set(secretName, keypair);
      
      return keypair;
    } catch (error) {
      console.error(`Failed to load wallet ${secretName}:`, error);
      throw error;
    }
  }

  static async loadWalletPool(): Promise<Keypair[]> {
    const wallets: Keypair[] = [];
    
    // Load pool of 100 wallets
    for (let i = 1; i <= 100; i++) {
      const secretName = `hootbot/wallet/pool/${i}`;
      try {
        const wallet = await this.loadWallet(secretName);
        wallets.push(wallet);
      } catch (error) {
        console.error(`Failed to load wallet ${i}:`, error);
      }
    }
    
    if (wallets.length === 0) {
      throw new Error('No valid wallets found in pool');
    }
    
    return wallets;
  }

  static async loadBurnerWallet(): Promise<Keypair> {
    return this.loadWallet('hootbot/wallet/burner');
  }
}
