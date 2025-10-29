#!/bin/bash
# HootBot/clear-cache.sh
# Clear TypeScript and ts-node cache

cd ~/Desktop/HootBot

echo "🧹 Clearing TypeScript cache..."

# Remove dist folder
rm -rf dist/

# Clear ts-node cache
rm -rf node_modules/.cache/

# Clear TypeScript build info
find . -name "*.tsbuildinfo" -type f -delete

# Clear any temporary files
find . -name "*.tmp" -type f -delete

echo "✅ Cache cleared!"
echo ""
echo "Now compile fresh:"
echo "npx tsc --build --clean"
echo "npx tsc"