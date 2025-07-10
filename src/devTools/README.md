# 🛢️ Project C³ Wrapping Engine

This module powers the official **C³ NFT Wrapper**, allowing hijacked Solana SPL tokens like `$OILC` to be locked and re-issued as branded, redeemable NFTs representing real-world commodities.

---

## 🔧 Overview

**Input:**  
- SPL Token (e.g., $OILC)  
- Amount to wrap (e.g., 500,000)  
- User's Solana wallet address

**Output:**  
- 1:1 NFT with custom C³ metadata  
- Vault-held tokens for future redemption

---

## 🧱 File Structure

```
/src/devTools/
├── wrapToken.ts       # API entry point for initiating a wrap
├── transferOILC.ts    # Transfers tokens from user to PDA vault
├── createNFT.ts       # Mints C³ NFT using Metaplex
├── constants.ts       # Program ID, seeds, vault keys
├── types.ts           # Shared types and interfaces
└── README.md          # This file
```

---

## 🧪 How to Use

1. **Wrap Token via API**

Send a `POST` request to your Fastify server:

```bash
curl -X POST http://localhost:3000/wrap-token \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "USER_PUBLIC_KEY",
    "tokenMint": "TOKEN_MINT_ADDRESS",
    "amountToWrap": "500000"
  }'
```

2. **Watch the logs** for:

```
✅ C³ NFT Minted: NFT_MINT_ADDRESS
```

---

## 📦 NFT Metadata Format

The NFTs created follow the Metaplex standard:

- `name`: C³ Crude Contract
- `symbol`: C3OIL
- `description`: “Represents locked $OILC”
- `image`: `/assets/oilcoin.png`
- `attributes`:  
  - Asset Class: Oil  
  - Wrapped Token: $OILC  
  - Amount: X  
  - C³ Status: Backed  
  - Redemption: Available

---

## 🛠️ Next Modules (Planned)

- 🔄 `redeemNFT.ts` — Burn NFT to unlock tokens
- 📊 `trackVaults.ts` — CLI tracker of total wrapped tokens
- 🖼️ UI: Connects to wallet, initiates wrap visually

---

## 🧠 Mission

> We don’t launch tokens.  
> We rescue them. Rebrand them.  
> And make them real.  

— Project C³
