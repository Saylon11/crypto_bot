// refreshSimpleHashMetadata.ts
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const SPL_MINT_ADDRESS = "Cwn9d1E636CPBTgtPXZAuqn6TgUh6mPpUMBr3w7kpump";
const VAULT_NFT_ID = "Fn2My1FYy5fJi7xmg2gWgNUD8M8RnqWpjdpxDBrXmEtC";

const headers = {
  "X-API-Key": SIMPLEHASH_API_KEY,
  "Content-Type": "application/json"
};

async function refreshSimpleHashMetadata() {
  try {
    console.log("🔁 Triggering SimpleHash metadata refresh for Vault NFT...");

    // Refresh the NFT metadata directly
    const nftRefresh = await axios.post(
      "https://api.simplehash.com/api/v0/metadata/refreshNFT",
      {
        chain: "solana",
        contract_address: VAULT_NFT_ID
      },
      { headers }
    );

    console.log("✅ Vault NFT refresh result:", nftRefresh.data);
  } catch (error) {
    console.error("❌ Error refreshing metadata with SimpleHash:", error);
  }
}

refreshSimpleHashMetadata();