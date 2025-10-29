#!/bin/bash
# HootBot/fix-all-casing.sh
# Fix all file casing issues

cd ~/Desktop/HootBot

echo "🔧 Fixing all file casing issues..."

# Check if files exist with wrong casing and rename them
if [ -f "src/mind/MindCore.ts" ]; then
  echo "Found MindCore.ts with uppercase M"
  git mv src/mind/MindCore.ts src/mind/mindCore.ts 2>/dev/null || mv src/mind/MindCore.ts src/mind/mindCore.ts
  echo "✅ Fixed mindCore.ts"
fi

if [ -f "src/executor/WalletManager.ts" ]; then
  echo "Found WalletManager.ts with uppercase W"
  git mv src/executor/WalletManager.ts src/executor/walletManager.ts 2>/dev/null || mv src/executor/WalletManager.ts src/executor/walletManager.ts
  echo "✅ Fixed walletManager.ts"
fi

if [ -f "src/executor/HootBotExecutor.ts" ]; then
  echo "Found HootBotExecutor.ts with uppercase H"
  git mv src/executor/HootBotExecutor.ts src/executor/hootBotExecutor.ts 2>/dev/null || mv src/executor/HootBotExecutor.ts src/executor/hootBotExecutor.ts
  echo "✅ Fixed hootBotExecutor.ts"
fi

# Clean any build cache
echo "🧹 Cleaning build cache..."
rm -rf dist/
rm -rf node_modules/.cache/

echo "✅ All file casing issues fixed!"
echo ""
echo "Run: npx tsc"