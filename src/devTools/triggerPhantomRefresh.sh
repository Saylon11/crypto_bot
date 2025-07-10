#!/bin/bash

NFT_MINT="2KgZAi7ZCeisEkLCni5pPuGbpf2VMkrNWMgt22Zzhvyq"
VAULT_WALLET="BeuXNjvA1Tpg1vAg4Zge1ekg3mfEt1ARohPCXahDR6UU"
MEMO="vault_signature:5811ad88017085c5f2fd61413e4f7b111beebf152476cf5a5a6f6a6a442e2759"

KEYPAIR=/Users/owner/.config/solana/dev.json

# 1. Airdrop small SOL (if needed) to enable fee for self-transfer
solana transfer "$VAULT_WALLET" 0.001 --from ~/.config/solana/dev.json --allow-unfunded-recipient

# 2. Trigger metadata refresh by self-looping NFT
spl-token transfer "$NFT_MINT" 1 "$VAULT_WALLET" \
  --owner "$KEYPAIR" \
  --fund-recipient \
  --allow-unfunded-recipient \
  --url https://api.mainnet-beta.solana.com

echo "✅ Metadata refresh transaction complete for Phantom indexing for NFT mint $NFT_MINT"
echo "🔍 Resolved URI:"
curl -s https://raw.githubusercontent.com/Saylon11/oilc-metadata/main/oilcoin_metadata.json | jq '.image'