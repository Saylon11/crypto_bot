import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createUpdateMetadataAccountV2Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  DataV2,
} from "@metaplex-foundation/mpl-token-metadata";
import bs58 from "bs58";

// Load wallet keypair
const secretKey = bs58.decode(
  "4SwRUYnWWks3QpbsaWMNHmVoc22MjG2edAXHunEJu3Xgn4GLTBtExNGv78THVuaGFKxHFBHY7jUtr8fHvjjkgayo"
);
const wallet = Keypair.fromSecretKey(secretKey);

// Solana connection
const connection = new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

// Token mint and metadata
const mint = new PublicKey("Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump");
const metadataPDA = PublicKey.findProgramAddressSync(
  [
    Buffer.from("metadata"),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ],
  TOKEN_METADATA_PROGRAM_ID
)[0];

// Metadata update
const newMetadata: DataV2 = {
  name: "OILCOIN",
  symbol: "OILC",
  uri: "https://cdn.jsdelivr.net/gh/Saylon11/oilc-metadata@main/oilcoin_metadata.json",
  sellerFeeBasisPoints: 0,
  creators: [
    {
      address: wallet.publicKey,
      verified: true,
      share: 100,
    },
  ],
  collection: null,
  uses: null,
};

const instruction = createUpdateMetadataAccountV2Instruction(
  {
    metadata: metadataPDA,
    updateAuthority: wallet.publicKey,
  },
  {
    updateMetadataAccountArgsV2: {
      data: newMetadata,
      updateAuthority: wallet.publicKey,
      primarySaleHappened: null,
      isMutable: true,
    },
  }
);

(async () => {
  try {
    const tx = new Transaction().add(instruction);
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("✅ Metadata updated:", signature);
  } catch (err) {
    console.error("❌ Failed to update metadata:", err);
  }
})();
