import dotenv from "dotenv";
dotenv.config();

import { Connection, PublicKey } from "@solana/web3.js";
// Ensure this compiles after you successfully install version 1.2.5:
// import {
//   Metadata,
//   PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
// } from "@metaplex-foundation/mpl-token-metadata";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const connection = new Connection(RPC_URL);

// Fully environment-based TOKEN_METADATA_PROGRAM_ID loaded from .env:
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID ?? '');
if (!TOKEN_METADATA_PROGRAM_ID) {
  throw new Error("PROGRAM_ID is not set. Please ensure it is defined in your .env file.");
}

const mintAddress = new PublicKey("2KgZAi7ZCeisEkLCni5pPuGbpf2VMkrNWMgt22Zzhvyq");

(async () => {
  try {
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintAddress.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(metadataPDA);
    if (!accountInfo) {
      console.error("❌ Metadata account not found.");
      return;
    }

    // Uncomment after proper package install:
    // const [metadata] = Metadata.deserialize(accountInfo.data);

    // Mock log to allow compilation:
    console.log("📦 Raw metadata buffer length:", accountInfo.data.length);
  } catch (error) {
    console.error("❌ Error reading metadata:", error);
  }
})();