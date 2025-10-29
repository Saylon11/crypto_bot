#!/usr/bin/env node
// HootBot/src/devTools/wallet-verifier.ts

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import chalk from 'chalk';
import { initializeSecretsManager, SecretsManager } from '../core/secretsManager';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  walletId: string;
  publicKey?: string;
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  level: 'character' | 'length' | 'derivation';
  message: string;
}

class WalletVerifier {
  private secretsManager: SecretsManager;
  private results: ValidationResult[] = [];

  constructor(secretsManager: SecretsManager) {
    this.secretsManager = secretsManager;
  }

  /**
   * Validate a single wallet secret
   */
  private async validateWallet(walletId: string, secretValue: string): Promise<ValidationResult> {
    const result: ValidationResult = {
      walletId,
      valid: true,
      errors: []
    };

    try {
      // Level 1: Character Set Validation
      let decoded: Uint8Array;
      try {
        // Try Base58 decode
        decoded = bs58.decode(secretValue.trim());
      } catch (error) {
        // Try JSON array format
        try {
          const parsed = JSON.parse(secretValue);
          if (!Array.isArray(parsed)) {
            throw new Error('Not a valid array');
          }
          decoded = new Uint8Array(parsed);
        } catch {
          result.errors.push({
            level: 'character',
            message: 'Invalid character set - not valid Base58 or JSON array'
          });
          result.valid = false;
          return result;
        }
      }

      // Level 2: Length Validation
      if (decoded.length !== 64) {
        result.errors.push({
          level: 'length',
          message: `Invalid key length: expected 64 bytes, got ${decoded.length}`
        });
        result.valid = false;
        return result;
      }

      // Level 3: Cryptographic Derivation
      try {
        const keypair = Keypair.fromSecretKey(decoded);
        result.publicKey = keypair.publicKey.toString();
        
        // Additional validation: verify the public key can be derived
        const testSignature = keypair.sign(Buffer.from('test'));
        if (testSignature.length !== 64) {
          throw new Error('Invalid signature length');
        }
      } catch (error) {
        result.errors.push({
          level: 'derivation',
          message: `Cryptographic derivation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
        result.valid = false;
      }

    } catch (error) {
      result.errors.push({
        level: 'derivation',
        message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      result.valid = false;
    }

    return result;
  }

  /**
   * Validate all wallets
   */
  public async validateAll(): Promise<boolean> {
    console.log(chalk.blue('🔍 Starting wallet validation...\n'));

    const walletIds = await this.secretsManager.listWalletSecrets();
    console.log(chalk.gray(`Found ${walletIds.length} wallets to validate\n`));

    let validCount = 0;
    let invalidCount = 0;

    for (const walletId of walletIds) {
      try {
        // Fetch the raw secret value for validation
        const secretValue = await (this.secretsManager as any).getSecret(
          `${(this.secretsManager as any).config.secretPrefix}/${walletId}`
        );
        
        const result = await this.validateWallet(walletId, secretValue);
        this.results.push(result);

        if (result.valid) {
          validCount++;
          console.log(chalk.green(`✅ ${walletId}: VALID`));
          console.log(chalk.gray(`   Public Key: ${result.publicKey}`));
        } else {
          invalidCount++;
          console.log(chalk.red(`❌ ${walletId}: INVALID`));
          result.errors.forEach(error => {
            console.log(chalk.red(`   ${error.level.toUpperCase()}: ${error.message}`));
          });
        }
      } catch (error) {
        invalidCount++;
        console.log(chalk.red(`❌ ${walletId}: FAILED TO FETCH`));
        console.log(chalk.red(`   ${error instanceof Error ? error.message : 'Unknown error'}`));
        
        this.results.push({
          walletId,
          valid: false,
          errors: [{
            level: 'character',
            message: `Failed to fetch secret: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        });
      }

      console.log(''); // Empty line between results
    }

    // Summary
    console.log(chalk.blue('━'.repeat(50)));
    console.log(chalk.blue('Validation Summary:'));
    console.log(chalk.green(`✅ Valid wallets: ${validCount}`));
    console.log(chalk.red(`❌ Invalid wallets: ${invalidCount}`));
    console.log(chalk.gray(`📊 Total checked: ${walletIds.length}`));
    console.log(chalk.blue('━'.repeat(50)));

    return invalidCount === 0;
  }

  /**
   * Generate a detailed report
   */
  public generateReport(outputPath: string): void {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        valid: this.results.filter(r => r.valid).length,
        invalid: this.results.filter(r => !r.valid).length
      },
      results: this.results,
      errorBreakdown: {
        character: this.results.filter(r => 
          r.errors.some(e => e.level === 'character')
        ).length,
        length: this.results.filter(r => 
          r.errors.some(e => e.level === 'length')
        ).length,
        derivation: this.results.filter(r => 
          r.errors.some(e => e.level === 'derivation')
        ).length
      }
    };

    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(chalk.gray(`\nDetailed report saved to: ${outputPath}`));
  }
}

// CLI Interface
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
    default: 'hootbot/wallet/pool'
  })
  .option('report', {
    alias: 'o',
    type: 'string',
    description: 'Output report file path',
    default: 'wallet-validation-report.json'
  })
  .option('fail-fast', {
    alias: 'f',
    type: 'boolean',
    description: 'Exit on first invalid wallet',
    default: false
  })
  .help()
  .alias('help', 'h')
  .parseSync();

// Main execution
async function main() {
  try {
    console.log(chalk.blue.bold('\n🔐 HootBot Wallet Verifier\n'));

    // Initialize secrets manager
    const secretsManager = initializeSecretsManager({
      region: argv.region,
      secretPrefix: argv.prefix,
      cacheEnabled: false // Disable cache for verification
    });

    // Create verifier
    const verifier = new WalletVerifier(secretsManager);

    // Run validation
    const success = await verifier.validateAll();

    // Generate report
    if (argv.report) {
      verifier.generateReport(argv.report);
    }

    // Exit with appropriate code
    if (!success) {
      console.log(chalk.red('\n⚠️  Validation failed! Some wallets are invalid.\n'));
      process.exit(1);
    } else {
      console.log(chalk.green('\n✨ All wallets validated successfully!\n'));
      process.exit(0);
    }

  } catch (error) {
    console.error(chalk.red('\n💥 Fatal error:'), error);
    process.exit(2);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}