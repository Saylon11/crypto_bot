// transferOILC.ts — Transfers $OILC from user to C³ Vault PDA

import dotenv from 'dotenv';
dotenv.config();

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
} from '@solana/spl-token';
import { VAULT_SEED } from './mintVault';

const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? '');

if (!PROGRAM_ID) {
  throw new Error('PROGRAM_ID is not set. Please ensure it is defined in your .env file.');
}

/**
 * Transfers the specified amount of $OILC from a user's wallet to the C³ vault PDA.
 */
export async function transferTokensToVault(
  connection: Connection,
  userWallet: PublicKey,
  tokenMint: PublicKey,
  amount: number
): Promise<PublicKey> {
  // 1. Derive user's ATA
  const userATA = await getAssociatedTokenAddress(tokenMint, userWallet);

  // 2. Derive PDA vault address
  const [vaultPDA] = await PublicKey.findProgramAddressSync(
    [Buffer.from(VAULT_SEED), tokenMint.toBuffer()],
    PROGRAM_ID
  );

  const vaultATA = await getAssociatedTokenAddress(tokenMint, vaultPDA, true);

  // 3. Create transfer instruction
  const transferIx = createTransferInstruction(
    userATA,
    vaultATA,
    userWallet,
    BigInt(amount)
  );

  // 4. Build transaction
  const tx = new Transaction().add(transferIx);

  // NOTE: Assumes user signs this externally or via injected wallet
  // You can pass in signers here or hand off to frontend wallet

  console.log('Prepared transfer of', amount, 'tokens to vault:', vaultATA.toBase58());

  // Return the vault address for metadata reference
  return vaultPDA;
}
