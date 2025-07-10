import {
  DataV2,
  createCreateMetadataAccountV3Instruction,
  CreateMetadataAccountArgsV3,
} from "@metaplex-foundation/mpl-token-metadata";
import { PublicKey, Transaction } from "@solana/web3.js";

const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

export async function createOilcMetadata(
  connection: any,
  wallet: { publicKey: PublicKey },
  mint: string,
  name: string,
  symbol: string,
  uri: string
) {
  const [metadataPDA] = await PublicKey.findProgramAddress(
    [
      Buffer.from("metadata"),
      METADATA_PROGRAM_ID.toBuffer(),
      new PublicKey(mint).toBuffer(),
    ],
    METADATA_PROGRAM_ID
  );

  const metadataData: DataV2 = {
    name: name,
    symbol: symbol,
    uri: uri,
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

  const instruction = createCreateMetadataAccountV3Instruction(
    {
      metadata: metadataPDA,
      mint: new PublicKey(mint),
      mintAuthority: wallet.publicKey,
      payer: wallet.publicKey,
      updateAuthority: wallet.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        data: metadataData,
        isMutable: true,
        collectionDetails: null,
      } as CreateMetadataAccountArgsV3,
    }
  );

  const transaction = new Transaction().add(instruction);
  return transaction;
}