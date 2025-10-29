#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { SecretsManagerClient, GetSecretValueCommand, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { Keypair } from '@solana/web3.js';
import * as bs58 from 'bs58';
import * as chalk from 'chalk';

interface VerificationResult {
  secretName: string;
  status: 'valid' | 'invalid';
  error?: string;
  publicKey?: string;
}

class WalletVerifier {
  private client: SecretsManagerClient;
  private results: VerificationResult[] = [];

  constructor(region: string) {
    this.client = new SecretsManagerClient({ region });
  }

  async verifySecret(secretName: string): Promise<VerificationResult> {
    try {
      // Fetch secret from AWS
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);
      
      if (!response.SecretString) {
        return { secretName, status: 'invalid', error: 'No secret value found' };
      }

      // Level 1: Parse JSON
      let secretKey: number[];
      try {
        secretKey = JSON.parse(response.SecretString);
      } catch {
        return { secretName, status: 'invalid', error: 'Invalid JSON format' };
      }

      // Level 2: Verify array length
      if (!Array.isArray(secretKey) || secretKey.length !== 64) {
        return { 
          secretName, 
          status: 'invalid', 
          error: `Length mismatch: expected 64 bytes, got ${secretKey.length}` 
        };
      }

      // Level 3: Cryptographic validation
      try {
        const keypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
        const publicKey = keypair.publicKey.toBase58();
        
        // Additional validation: ensure we can encode/decode
        bs58.decode(publicKey);
        
        return { secretName, status: 'valid', publicKey };
      } catch (error: any) {
        return { 
          secretName, 
          status: 'invalid', 
          error: `Derivation error: ${error.message}` 
        };
      }
    } catch (error: any) {
      return { 
        secretName, 
        status: 'invalid', 
        error: `AWS error: ${error.message}` 
      };
    }
  }

  async verifyPool(prefix: string = 'hootbot/wallet/'): Promise<void> {
    console.log(chalk.blue(`🔍 Scanning for secrets with prefix: ${prefix}`));
    
    // List all secrets matching prefix
    const listCommand = new ListSecretsCommand({
      Filters: [{ Key: 'name', Values: [prefix] }]
    });
    
    const secrets = await this.client.send(listCommand);
    
    if (!secrets.SecretList || secrets.SecretList.length === 0) {
      console.error(chalk.red('❌ No secrets found with the specified prefix'));
      process.exit(1);
    }

    console.log(chalk.green(`📊 Found ${secrets.SecretList.length} secrets to verify\n`));

    // Verify each secret
    for (const secret of secrets.SecretList) {
      if (secret.Name) {
        const result = await this.verifySecret(secret.Name);
        this.results.push(result);
        
        if (result.status === 'valid') {
          console.log(chalk.green(`✅ ${result.secretName}`));
          console.log(chalk.gray(`   Public Key: ${result.publicKey?.substring(0, 8)}...`));
        } else {
          console.log(chalk.red(`❌ ${result.secretName}`));
          console.log(chalk.red(`   Error: ${result.error}`));
        }
      }
    }

    // Summary
    const validCount = this.results.filter(r => r.status === 'valid').length;
    const invalidCount = this.results.filter(r => r.status === 'invalid').length;
    
    console.log('\n' + chalk.bold('Summary:'));
    console.log(chalk.green(`✅ Valid wallets: ${validCount}`));
    console.log(chalk.red(`❌ Invalid wallets: ${invalidCount}`));
    
    // Exit with error if any wallets are invalid
    if (invalidCount > 0) {
      process.exit(1);
    }
  }
}

// CLI setup
const argv = yargs(hideBin(process.argv))
  .option('region', {
    alias: 'r',
    type: 'string',
    description: 'AWS region',
    default: 'us-east-1'
  })
  .option('prefix', {
    alias: 'p',
    type: 'string',
    description: 'Secret name prefix',
    default: 'hootbot/wallet/'
  })
  .help()
  .parseSync();

// Run verifier
const verifier = new WalletVerifier(argv.region);
verifier.verifyPool(argv.prefix).catch(console.error);
