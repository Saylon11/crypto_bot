#!/bin/bash
# HootBot/reorganize.sh
# Script to reorganize HootBot folder structure

echo "🦉 HootBot Folder Reorganization"
echo "================================"
echo ""

# Create new folder structure
echo "📁 Creating new folder structure..."

# Main bots folder
mkdir -p src/bots

# Sub-folders for different bot types
mkdir -p src/bots/volume      # Volume generation bots
mkdir -p src/bots/raid        # Raid and pump bots
mkdir -p src/bots/mind        # MIND integration bots
mkdir -p src/bots/telegram    # Telegram bots
mkdir -p src/bots/shared      # Shared utilities
mkdir -p src/bots/config      # Bot configurations

echo "✅ Folder structure created!"
echo ""
echo "📂 New structure:"
echo "└── src/"
echo "    └── bots/"
echo "        ├── volume/      # Volume generation bots"
echo "        ├── raid/        # Raid and pump bots"
echo "        ├── mind/        # MIND integration bots"
echo "        ├── telegram/    # Telegram bots"
echo "        ├── shared/      # Shared utilities"
echo "        └── config/      # Bot configurations"
echo ""

# Move existing files (safely, with confirmation)
echo "🚀 Ready to move files to new structure"
echo ""
echo "Suggested file moves:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "RAID BOTS → src/bots/raid/"
echo "  • raidHootBot.ts"
echo "  • raidScheduler.ts"
echo "  • raidConfig.ts"
echo "  • tradeExecutor.ts"
echo ""
echo "TELEGRAM BOTS → src/bots/telegram/"
echo "  • telegramBot.ts"
echo ""
echo "VOLUME BOT → src/bots/volume/"
echo "  • volumeGenerator.ts (new)"
echo "  • volumeMonitor.ts (new)"
echo ""
echo "CONFIGURATIONS → src/bots/config/"
echo "  • raidConfig.ts"
echo "  • volumeConfig.ts (new)"
echo ""

# Create index files for clean imports
echo "📝 Creating index files for clean imports..."

# Create main bots index
cat > src/bots/index.ts << 'EOF'
// HootBot/src/bots/index.ts
// Main entry point for all bots

export * from './volume';
export * from './raid';
export * from './telegram';
export * from './shared';

// Bot registry
export const BotRegistry = {
  volume: {
    name: 'Volume Generator',
    path: './volume/volumeGenerator',
    description: 'Generates organic-looking trading volume'
  },
  raid: {
    name: 'Raid Bot',
    path: './raid/raidHootBot',
    description: 'Executes coordinated buy sequences'
  },
  telegram: {
    name: 'Telegram Bot',
    path: './telegram/telegramBot',
    description: 'Telegram integration for commands'
  }
};
EOF

# Create volume bot index
cat > src/bots/volume/index.ts << 'EOF'
// HootBot/src/bots/volume/index.ts
export { runVolumeGenerator, executeVolumeTrade, getVolumeStats } from './volumeGenerator';
export { monitorVolume } from './volumeMonitor';
export { VOLUME_CONFIG } from './volumeConfig';
EOF

# Create raid bot index
cat > src/bots/raid/index.ts << 'EOF'
// HootBot/src/bots/raid/index.ts
export { executeRaidSequence } from './raidHootBot';
export { scheduleRaid, startRaidScheduler } from './raidScheduler';
export { RAID_CONFIG, RaidMode, getRaidParams } from './raidConfig';
export { executeBuy, executePanicBuy, initiateCoordinatedBuy } from './tradeExecutor';
EOF

echo "✅ Index files created!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "1. Move your existing bot files to the new folders"
echo "2. Update import paths in your files"
echo "3. Test each bot to ensure it still works"
echo ""
echo "💡 Example import updates:"
echo "   OLD: import { executeBuy } from '../pumpTools/tradeExecutor'"
echo "   NEW: import { executeBuy } from '../bots/raid'"
echo ""
echo "Would you like me to create move commands for your files? (y/n)"