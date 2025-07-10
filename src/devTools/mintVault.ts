// mintVault.ts
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import dotenv from "dotenv";
import fs from "fs";
const wallet = JSON.parse(fs.readFileSync(`${process.env.HOME}/.config/solana/dev.json`, "utf8"));

dotenv.config();

const IMAGE_URI = "https://gateway.pinata.cloud/ipfs/bafybeieqqa7vqdpgjdfpztxbrxmnp5ve4lo4s6ek655siijwn36i3hszsy";
const METADATA_URI = "https://raw.githubusercontent.com/Saylon11/oilc-metadata/main/oilcoin_metadata.json";

(async () => {
  const connection = new Connection("https://api.mainnet-beta.solana.com");
  const payer = Keypair.fromSecretKey(Uint8Array.from(wallet));

  const metaplex = Metaplex.make(connection)
    .use(keypairIdentity(payer));

  const { nft } = await metaplex.nfts().create({
    uri: METADATA_URI,
    name: "Oil Coin",
    sellerFeeBasisPoints: 0,
    symbol: "OILCOIN",
    creators: [
      {
        address: payer.publicKey,
        share: 100
      }
    ],
    isMutable: true,
    maxSupply: 1,
  });

  console.log(`✅ Vault NFT minted: ${nft.address.toBase58()}`);
})();

export const VAULT_SEED = 'vault_seed_value'; // Replace with actual seed if known