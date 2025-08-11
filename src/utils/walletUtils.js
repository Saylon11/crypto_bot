// src/utils/walletUtils.js
const { Keypair } = require('@solana/web3.js');
const bs58 = require('bs58');
const fs = require('fs');

/**
 * Load HootBot wallet from keypair file or environment variable
 * @returns {Keypair} The HootBot wallet keypair
 */
function loadHootBotWallet() {
  // First try to load from keypair file
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  
  if (keypairPath && fs.existsSync(keypairPath)) {
    try {
      console.log(`🔑 Loading wallet from: ${keypairPath}`);
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
      console.log(`✅ Wallet loaded: ${keypair.publicKey.toBase58()}`);
      return keypair;
    } catch (error) {
      console.warn(`⚠️ Failed to load keypair from file: ${error.message}`);
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
        `🚨 Invalid secret key length: expected 64 bytes, got ${secretKeyUint8Array.length}.`
      );
    }

    const keypair = Keypair.fromSecretKey(secretKeyUint8Array);
    console.log("✅ Wallet loaded from WALLET_SECRET_KEY");
    console.log(`🦉 Wallet address: ${keypair.publicKey.toBase58()}`);
    return keypair;
  } catch (error) {
    console.error("🚨 Error loading wallet:", error.message);
    throw error;
  }
}

// Export both names for compatibility
module.exports = {
  loadHootBotWallet,
  decodeHootBotKeypair: loadHootBotWallet // Alias for compatibility
};