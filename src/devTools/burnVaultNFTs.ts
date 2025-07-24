import {
  Connection,
  Keypair,
  PublicKey,
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  burn,
} from '@solana/spl-token';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import bs58 from 'bs58';

dotenv.config();

// === CONFIG ===
const RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

const BURNER_SECRET_KEY = process.env.BURNER_SECRET_KEY || '';
if (!BURNER_SECRET_KEY) {
  throw new Error('BURNER_SECRET_KEY is not set in .env');
}
const payer = Keypair.fromSecretKey(bs58.decode(BURNER_SECRET_KEY));
const burnRegistryPath = path.join(__dirname, 'burnRegistry.ts');

const mintList: string[] = [
  // Add legacy Vault NFT mint addresses to burn
  '2KgZAi7ZCeisEkLCni5pPuGbpf2VMkrNWMgt22Zzhvyq',
  'Fn2My1FYy5fJi7xmg2gWgNUD8M8RnqWpjdpxDBrXmEtC',
];

// === HELPERS ===
async function burnVaultNFT(mint: string) {
  const mintPubkey = new PublicKey(mint);
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payer,
    mintPubkey,
    payer.publicKey
  );

  console.log(`🔥 Burning NFT: ${mint}`);
  await burn(
    connection,
    payer,
    tokenAccount.address,
    mintPubkey,
    payer.publicKey,
    1
  );

  console.log(`✅ Successfully burned NFT: ${mint}`);
  return true;
}

function appendToBurnRegistry(mint: string) {
  const timestamp = new Date().toISOString().split('T')[0];

  const burnEntry = `  {
    mint: "${mint}",
    burnedAt: "${timestamp}",
    reason: "Duplicate or legacy Vault NFT burned by script"
  },`;

  const file = fs.readFileSync(burnRegistryPath, 'utf8');
  const updated = file.replace(
    /export const burnedVaultNFTs: \{[^}]+\}\[] = \[\n([\s\S]*?)\];/,
    (match, group) => {
      return `export const burnedVaultNFTs: { mint: string; burnedAt: string; reason?: string }[] = [\n${group}${burnEntry}\n];`;
    }
  );

  fs.writeFileSync(burnRegistryPath, updated, 'utf8');
  console.log(`📝 Logged burn of ${mint} to burnRegistry.ts`);
}

// === MAIN ===
(async () => {
  for (const mint of mintList) {
    try {
      await burnVaultNFT(mint);
      appendToBurnRegistry(mint);
    } catch (err) {
      console.error(`❌ Failed to burn ${mint}:`, err);
    }
  }
})();