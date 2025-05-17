import { Keypair } from "@solana/web3.js";
/**
 * Decodes a Phantom wallet secret key from the environment variable `PHANTOM_SECRET_KEY`
 * into a Solana Keypair.
 * @returns {Keypair} The decoded Solana Keypair.
 */
export declare function decodePhantomKeypair(): Keypair;
/**
 * Decodes the burner wallet keypair from the environment variable `BURNER_SECRET_KEY`.
 * @returns {Keypair} The burner Solana Keypair.
 */
export declare function decodeBurnerKeypair(): Keypair;
