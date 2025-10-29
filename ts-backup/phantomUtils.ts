// HootBot/src/utils/phantomUtils.ts

import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import fs from "fs";
import { getSecretsManager } from "../core/secretsManager";
import { Logger } from "./logger";

const logger = new Logger("PhantomUtils");

/**
 * Decodes a Phantom wallet secret key from the environment variable `PHANTOM_SECRET_KEY`
 * into a Solana Keypair. Will transition to AWS Secrets Manager in production.
 * @returns {Keypair} The decoded Solana Keypair.
 */
export function decodePhantomKeypair(): Keypair {
  const secretKeyBase58 = process.env.PHANTOM_SECRET_KEY;

  if (!secretKeyBase58) {
    throw new Error("🚨 Environment variable PHANTOM_SECRET_KEY is missing.");
  }

  try {
    // Decode the Base58-encoded secret key
    const secretKeyUint8Array = bs58.decode(secretKeyBase58);

    // Validate the length of the decoded secret key
    if (secretKeyUint8Array.length !== 64) {
      throw new Error(
        `🚨 Invalid secret key length: expected 64 bytes, got ${secretKeyUint8Array.length}.`,
      );
    }

    // Create and return the Solana Keypair
    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);
    logger.info("Phantom wallet keypair decoded successfully");
    return keypair;
  } catch (error: unknown) {
    logger.error("Error decoding Phantom wallet keypair", error as Error);
    throw error;
  }
}

/**
 * Decodes the burner wallet keypair.
 * In production, this should come from AWS Secrets Manager.
 * @returns {Keypair} The burner Solana Keypair.
 */
export function decodeBurnerKeypair(): Keypair {
  const secretKeyBase58 = process.env.BURNER_SECRET_KEY;

  if (!secretKeyBase58) {
    throw new Error("🚨 Environment variable BURNER_SECRET_KEY is missing.");
  }

  try {
    const secretKeyUint8Array = bs58.decode(secretKeyBase58);

    if (secretKeyUint8Array.length !== 64) {
      throw new Error(
        `🚨 Invalid burner secret key length: expected 64 bytes, got ${secretKeyUint8Array.length}.`,
      );
    }

    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);
    logger.info("Burner wallet keypair decoded successfully");
    return keypair;
  } catch (error: unknown) {
    logger.error("Error decoding Burner wallet keypair", error as Error);
    throw error;
  }
}

/**
 * Decodes the HootBot wallet keypair with AWS Secrets Manager integration.
 * Order of precedence:
 * 1. AWS Secrets Manager (if initialized)
 * 2. Local keypair file (HOOTBOT_KEYPAIR_PATH)
 * 3. Base58 environment variable (WALLET_SECRET_KEY)
 * @returns {Promise<Keypair>} The HootBot Solana Keypair.
 */
export async function decodeHootBotKeypair(): Promise<Keypair> {
  // Try AWS Secrets Manager first (if initialized)
  try {
    const secretsManager = getSecretsManager();
    const keypair = await secretsManager.getWalletKeypair('hootbot-main');
    logger.info("HootBot wallet loaded from AWS Secrets Manager", {
      publicKey: keypair.publicKey.toBase58()
    });
    return keypair;
  } catch (error) {
    // Secrets Manager not initialized or wallet not found
    logger.debug("AWS Secrets Manager not available, falling back to local methods");
  }

  // Try local keypair file
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  
  if (keypairPath && fs.existsSync(keypairPath)) {
    try {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
      logger.info("HootBot wallet loaded from file", {
        path: keypairPath,
        publicKey: keypair.publicKey.toBase58()
      });
      return keypair;
    } catch (error) {
      logger.warn("Failed to load keypair from file, falling back to WALLET_SECRET_KEY");
    }
  }

  // Fall back to base58 encoded secret key
  const secretKeyBase58 = process.env.WALLET_SECRET_KEY;

  if (!secretKeyBase58) {
    throw new Error("🚨 No wallet configuration available. Please set up AWS Secrets Manager or provide WALLET_SECRET_KEY.");
  }

  try {
    const secretKeyUint8Array = bs58.decode(secretKeyBase58);

    if (secretKeyUint8Array.length !== 64) {
      throw new Error(
        `🚨 Invalid HootBot secret key length: expected 64 bytes, got ${secretKeyUint8Array.length}.`,
      );
    }

    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);
    logger.info("HootBot wallet decoded from base58", {
      publicKey: keypair.publicKey.toBase58()
    });
    return keypair;
  } catch (error: unknown) {
    logger.error("Error decoding HootBot wallet keypair", error as Error);
    throw error;
  }
}

/**
 * Load a wallet pool from AWS Secrets Manager
 * @param poolName Name of the wallet pool (e.g., 'raid-wallets', 'trading-wallets')
 * @returns Map of wallet ID to Keypair
 */
export async function loadWalletPool(poolName: string): Promise<Map<string, Keypair>> {
  try {
    const secretsManager = getSecretsManager();
    const walletIds = await secretsManager.listWalletSecrets();
    
    // Filter wallets by pool name
    const poolWalletIds = walletIds.filter(id => id.startsWith(`${poolName}/`));
    
    logger.info(`Loading ${poolWalletIds.length} wallets from pool: ${poolName}`);
    
    const wallets = new Map<string, Keypair>();
    
    for (const walletId of poolWalletIds) {
      try {
        const keypair = await secretsManager.getWalletKeypair(walletId);
        wallets.set(walletId, keypair);
      } catch (error) {
        logger.error(`Failed to load wallet ${walletId}`, error as Error);
      }
    }
    
    return wallets;
  } catch (error) {
    logger.error(`Failed to load wallet pool ${poolName}`, error as Error);
    throw error;
  }
}

// Maintain backward compatibility with synchronous function
export function decodeHootBotKeypairSync(): Keypair {
  logger.warn("Using synchronous wallet loading - consider migrating to async version");
  
  // Only support local methods for sync version
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  
  if (keypairPath && fs.existsSync(keypairPath)) {
    try {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      return Keypair.fromSecretKey(new Uint8Array(keypairData));
    } catch (error) {
      logger.warn("Failed to load keypair from file");
    }
  }

  const secretKeyBase58 = process.env.WALLET_SECRET_KEY;
  if (!secretKeyBase58) {
    throw new Error("🚨 No wallet configuration available for sync loading.");
  }

  const secretKeyUint8Array = bs58.decode(secretKeyBase58);
  return Keypair.fromSecretKey(secretKeyUint8Array);
}