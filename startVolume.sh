#!/bin/bash
# HootBot/startVolume.sh
# Simple launcher for the volume generator

echo "🦉 HootBot Volume Generator Launcher"
echo "==================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in HootBot directory!"
    echo "Please run from: ~/Desktop/HootBot"
    exit 1
fi

echo "📊 Volume Bot Settings:"
echo "- Min buy: 0.001 SOL"
echo "- Max buy: 0.01 SOL"
echo "- Avg delay: 8 minutes"
echo "- Target daily volume: 1 SOL"
echo "- Using 6 wallets (Master + 5 Raid wallets)"
echo ""

# Ask for confirmation
read -p "Start volume generator? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting volume generator..."
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Run the volume generator
    node dist/bots/volume/volumeGenerator.js
else
    echo "❌ Cancelled"
    exit 0
fi
