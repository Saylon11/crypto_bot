#!/bin/bash

# === CONFIG ===
FROM_WALLET_PATH="/Users/owner/.config/solana/dev.json" # Path to keypair file
TO_WALLET="BeuXNjvA1Tpg1vAg4Zge1ekg3mfEt1ARohPCXahDR6UU"
NFT_MINT="Fn2My1FYy5fJi7xmg2gWgNUD8M8RnqWpjdpxDBrXmEtC"
MEMO="vault_signature:51b22ad64295cd5988974e42b84982f5b048ae38dcff1a151fd7488d957d4160"

# === EXECUTE ===
solana config set --keypair "$FROM_WALLET_PATH" --config ~/.config/solana/cli/config.yml > /dev/null
echo "Sending Vault NFT to vault wallet..."

echo "🔑 Using keypair address:"
solana address --keypair "$FROM_WALLET_PATH"

spl-token transfer \
  "$NFT_MINT" 1 "$TO_WALLET" \
  --fund-recipient \
  --allow-unfunded-recipient \
  --owner "$FROM_WALLET_PATH" \
  --config ~/.config/solana/cli/config.yml

echo "✅ Vault NFT sent to: $TO_WALLET"
echo "✅ Transfer memo (manual log only): $MEMO"