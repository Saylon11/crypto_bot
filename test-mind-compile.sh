echo "🧪 Testing MIND integration compilation..."
echo ""

# Create a temporary tsconfig just for MIND files
cat > tsconfig.mind.json << EOF
{
  "extends": "./tsconfig.json",
  "include": [
    "src/mind/**/*",
    "src/executor/**/*",
    "src/scanners/**/*",
    "src/types/mind.ts",
    "src/orchestrator.ts",
    "src/launch.ts",
    "src/pumpTools/tradeExecutor.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF

echo "📁 MIND Integration Files:"
echo "  - src/mind/mindCore.ts"
echo "  - src/mind/contract.ts"
echo "  - src/executor/hootBotExecutor.ts"
echo "  - src/executor/walletManager.ts"
echo "  - src/scanners/gemScanner.ts"
echo "  - src/scanners/unifiedScanner.ts"
echo "  - src/types/mind.ts"
echo "  - src/orchestrator.ts"
echo "  - src/launch.ts"
echo ""

echo "🔍 Checking MIND files only..."
npx tsc -p tsconfig.mind.json --noEmit

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ MIND integration compiles successfully!"
else
  echo ""
  echo "❌ MIND integration has errors"
fi