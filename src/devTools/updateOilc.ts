import dotenv from 'dotenv';
dotenv.config();

import bs58 from 'bs58';

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

import {
  createUpdateMetadataAccountV2Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from '@metaplex-foundation/mpl-token-metadata';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

const OILC_MINT_ADDRESS = new PublicKey('2KgZAi7ZCeisEkLCni5pPuGbpf2VMkrNWMgt22Zzhvyq');
const NEW_METADATA_URI = 'https://raw.githubusercontent.com/Saylon11/oilc-metadata/main/public/metadata/oilc.json';

if (!process.env.WALLET_SECRET_KEY) {
  throw new Error('WALLET_SECRET_KEY missing from .env');
}

const secretKey = bs58.decode(process.env.WALLET_SECRET_KEY!);
const updateAuthority = Keypair.fromSecretKey(secretKey);

(async () => {
  try {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        OILC_MINT_ADDRESS.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const instruction = createUpdateMetadataAccountV2Instruction(
      {
        metadata: metadataPDA,
        updateAuthority: updateAuthority.publicKey,
      },
      {
        updateMetadataAccountArgsV2: {
          data: {
            name: 'Oil Coin',
            symbol: 'OILCOIN',
            uri: NEW_METADATA_URI,
            sellerFeeBasisPoints: 0,
            creators: [
              {
                address: updateAuthority.publicKey,
                verified: true,
                share: 100,
              },
            ],
            collection: null, // Set to null or provide a valid collection object
            uses: null, // Set to null or provide a valid uses object
          },
          updateAuthority: updateAuthority.publicKey,
          primarySaleHappened: null,
          isMutable: true,
        },
      }
    );

    const tx = new Transaction().add(instruction);
    const sig = await sendAndConfirmTransaction(connection, tx, [updateAuthority]);
    console.log('✅ Metadata update successful.');
    console.log(`🔗 https://solscan.io/tx/${sig}`);
  } catch (err) {
    console.error('❌ Metadata update failed:', err);
  }
})();
