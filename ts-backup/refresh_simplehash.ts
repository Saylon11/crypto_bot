import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config(); // ✅ Explicitly load .env file

// === CONFIG ===
const SIMPLEHASH_API_KEY = process.env.SIMPLEHASH_API_KEY;
const TOKEN_MINT = 'Fn2My1FYy5fJi7xmg2gWgNUD8M8RnqWpjdpxDBrXmEtC'; // ✅ Vault NFT Mint
const CHAIN = 'solana';

if (!SIMPLEHASH_API_KEY) {
  console.error('❌ SIMPLEHASH_API_KEY is not defined in your .env file.');
  process.exit(1);
}

async function refreshSimpleHash() {
  try {
    const response = await axios.post(
      'https://api.simplehash.com/api/v0/nfts/refresh',
      {
        chain: CHAIN,
        nft_id: TOKEN_MINT, // ✅ Required field for Solana NFT
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': SIMPLEHASH_API_KEY,
        },
      }
    );

    if (response.status === 200) {
      console.log('✅ SimpleHash refresh triggered successfully for Vault NFT.');
    } else {
      console.warn(`⚠️ Unexpected response status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('❌ Failed to refresh SimpleHash metadata:', error?.response?.data || error.message);
  }
}

refreshSimpleHash();