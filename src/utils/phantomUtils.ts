import bs58 from "bs58";
import { Keypair } from "@solana/web3.js";
import fs from "fs";

/**
 * Decodes a Phantom wallet secret key from the environment variable `PHANTOM_SECRET_KEY`
 * into a Solana Keypair.
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
    console.log("✅ Phantom wallet keypair decoded successfully.");
    return keypair;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Error decoding Phantom wallet keypair:", error.message);
    } else {
      console.error("🚨 Error decoding Phantom wallet keypair:", error);
    }
    throw error;
  }
}

/**
 * Decodes the burner wallet keypair from the environment variable `BURNER_SECRET_KEY`.
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
    console.log("🔥 Burner wallet keypair decoded successfully.");
    return keypair;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Error decoding Burner wallet keypair:", error.message);
    } else {
      console.error("🚨 Error decoding Burner wallet keypair:", error);
    }
    throw error;
  }
}

/**
 * Decodes the HootBot wallet keypair. 
 * First tries to load from HOOTBOT_KEYPAIR_PATH file, 
 * then falls back to WALLET_SECRET_KEY base58 string.
 * @returns {Keypair} The HootBot Solana Keypair.
 */
export function decodeHootBotKeypair(): Keypair {
  // First try to load from keypair file
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  
  if (keypairPath && fs.existsSync(keypairPath)) {
    try {
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
      console.log("🦉 HootBot wallet keypair loaded from file successfully.");
      console.log(`🦉 Wallet address: ${keypair.publicKey.toBase58()}`);
      return keypair;
    } catch (error) {
      console.warn("⚠️ Failed to load keypair from file, falling back to WALLET_SECRET_KEY");
    }
  }

  // Fall back to base58 encoded secret key
  const secretKeyBase58 = process.env.WALLET_SECRET_KEY;

  if (!secretKeyBase58) {
    throw new Error("🚨 Neither HOOTBOT_KEYPAIR_PATH nor WALLET_SECRET_KEY is available.");
  }

  try {
    const secretKeyUint8Array = bs58.decode(secretKeyBase58);

    if (secretKeyUint8Array.length !== 64) {
      throw new Error(
        `🚨 Invalid HootBot secret key length: expected 64 bytes, got ${secretKeyUint8Array.length}.`,
      );
    }

    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);
    console.log("🦉 HootBot wallet keypair decoded successfully from base58.");
    console.log(`🦉 Wallet address: ${keypair.publicKey.toBase58()}`);
    return keypair;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Error decoding HootBot wallet keypair:", error.message);
    } else {
      console.error("🚨 Error decoding HootBot wallet keypair:", error);
    }
    throw error;
  }
}