echo "🔧 Fixing file casing issues..."

# Fix mind folder files
if [ -f "src/mind/MindCore.ts" ]; then
  mv src/mind/MindCore.ts src/mind/mindCore.ts
  echo "✅ Renamed MindCore.ts to mindCore.ts"
fi

# Fix executor folder files
if [ -f "src/executor/HootBotExecutor.ts" ]; then
  mv src/executor/HootBotExecutor.ts src/executor/hootBotExecutor.ts
  echo "✅ Renamed HootBotExecutor.ts to hootBotExecutor.ts"
fi

if [ -f "src/executor/WalletManager.ts" ]; then
  mv src/executor/WalletManager.ts src/executor/walletManager.ts
  echo "✅ Renamed WalletManager.ts to walletManager.ts"
fi

echo "✅ File casing fixed!"
echo ""
echo "Now run: npx tsc"