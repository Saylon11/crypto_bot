#!/bin/bash
# Update HootBot's token scanner with Raydium + liquidity filtering

cd ~/Desktop/HootBot

echo "🔧 Updating token scanner with Raydium integration..."

# Backup current scanner
cp src/pumpTools/tokenScanner.js src/pumpTools/tokenScanner.js.backup
echo "✅ Backed up current scanner"

# First, let's check if we need to compile from TypeScript
if [ -f "src/pumpTools/tokenScanner.ts" ]; then
    echo "📦 Found TypeScript version, compiling..."
    npx tsc src/pumpTools/tokenScanner.ts --outDir dist --module commonjs --target es2020 --esModuleInterop --skipLibCheck --allowJs
fi

# Now copy the enhanced scanner
echo "📝 Installing enhanced scanner..."
cp enhancedTokenScanner.js src/pumpTools/tokenScanner.js

# Update the smartTrader.js import if needed
echo "🔄 Checking smartTrader imports..."
if grep -q "require('./dist/pumpTools/tokenScanner')" src/pumpTools/smartTrader.js; then
    echo "✅ smartTrader is using dist path (good)"
    # Also compile to dist
    cp enhancedTokenScanner.js dist/pumpTools/tokenScanner.js
elif grep -q "require('./tokenScanner')" src/pumpTools/smartTrader.js; then
    echo "⚠️ smartTrader using relative path, updating..."
    sed -i '' "s|require('./tokenScanner')|require('./tokenScanner')|g" src/pumpTools/smartTrader.js
fi

# Test the new scanner
echo -e "\n🧪 Testing enhanced scanner..."
node -e "
const { scanAllTokens } = require('./src/pumpTools/tokenScanner');
console.log('✅ Scanner loaded successfully');
console.log('🔍 Running quick test...');
scanAllTokens().then(tokens => {
  console.log(\`✅ Test complete! Found \${tokens.length} tokens\`);
  if (tokens.length > 0) {
    console.log(\`   Top token: \${tokens[0].symbol} - Score: \${tokens[0].score}\`);
  }
}).catch(err => {
  console.error('❌ Scanner test failed:', err.message);
});
"

echo -e "\n✨ Scanner update complete!"
echo "The enhanced scanner now includes:"
echo "  🌊 Raydium pool scanning for low-cap gems"
echo "  💧 Liquidity cycle analysis to filter quality tokens"
echo "  📊 Enhanced scoring based on multiple factors"
echo "  🛡️ Safety filters for minimum liquidity/volume"

echo -e "\n🦉 Ready to find better trading opportunities!"