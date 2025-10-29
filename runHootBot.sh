#!/bin/bash
# runHootBot.sh - Proper launch script using .env.scanner

cd ~/Desktop/HootBot

echo "🦉 HootBot Aggressive Trading Mode Launcher"
echo "=========================================="

# Check for .env.scanner
if [ ! -f ".env.scanner" ]; then
    echo "❌ .env.scanner not found!"
    echo "Looking for environment files..."
    ls -la .env* 2>/dev/null
    exit 1
fi

echo "✅ Found .env.scanner"

# Display current configuration
echo -e "\n📋 Current Configuration:"
grep -E "^(HELIUS|WALLET|TOKEN|IGNORE)" .env.scanner | head -10

# Ask for confirmation
echo -e "\n⚠️  WARNING: This will run HootBot in AGGRESSIVE MODE!"
echo "Features:"
echo "  🚀 Scans for new tokens every cycle"
echo "  💰 Base trade: 0.15 SOL (3x conservative)"
echo "  🎯 Max position: 1.0 SOL"
echo "  📈 Profit targets: 20%, 40%, 75%"
echo "  🛡️ Stop loss: -20%"

# Check if TEST mode is enabled
if grep -q "^testMode: true" src/pumpTools/smartTrader.js 2>/dev/null; then
    echo -e "\n🧪 TEST MODE is currently ENABLED (no real trades)"
else
    echo -e "\n🔥 LIVE TRADING MODE - Real money will be used!"
fi

echo -e "\nPress ENTER to continue or Ctrl+C to cancel..."
read

# Load environment and run
echo -e "\n🚀 Starting HootBot Smart Trader..."
export $(cat .env.scanner | grep -v '^#' | xargs) && node src/pumpTools/smartTrader.js