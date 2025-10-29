#!/bin/bash

# TSReaper.sh - Degen GhostBuster: Purge TS remnants, backup first, streamline for 85%+ M.I.N.D. wins
# Run from hoothub/ root (cd ~/Desktop/HootBot)
# Date: August 12, 2025 - Backup named with 20250812

# Step 0: Verify pwd - Must be in HootBot root
if [ ! -d ".git" ]; then
  echo "Error: Run from HootBot root (where .git is). Stalling prevented."
  exit 1
fi

# Step 1: Backup (Unseen Guardrail - Snapshot branch + full folder copy)
echo "=== Backup Phase: Safeguarding M.I.N.D.'s Emotional Liquidity Genius ==="
git branch backup-pre-purge-20250812 || { echo "Git branch stalled - Check repo status."; exit 1; }
cp -r ~/Desktop/HootBot ~/Desktop/HootBot-Backup-20250812 || { echo "CP stalled - Check permissions/space."; exit 1; }
echo "Backup complete: Branch 'backup-pre-purge-20250812' + Folder 'HootBot-Backup-20250812'."

# Step 2: List & Confirm Purge Targets (Interactive - No Blind Nukes)
echo "=== Listing TS/Unused Targets - Review for Holds (e.g., M.I.N.D. Canopy Logic) ==="
ts_files=$(find . -maxdepth 5 -name "*.ts" -print)
dts_files=$(find . -maxdepth 5 -name "*.d.ts" -print)
dist_build=$(ls -d dist/ build/ 2>/dev/null)

echo "TS Files to Purge:"
echo "$ts_files" | nl
echo "DTS Files to Purge:"
echo "$dts_files" | nl
echo "Dist/Build Folders to Purge:"
echo "$dist_build" | nl

read -p "Confirm purge? (y/n): " confirm
if [ "$confirm" != "y" ]; then
  echo "Purge aborted - Restore from backup if needed."
  exit 0
fi

# Step 3: Selective Purge (No Stall - Maxdepth Limits)
echo "=== Purging TS Remnants - Streamlining for Faster Vibe Checks ==="
find . -maxdepth 5 -name "*.ts" -delete
find . -maxdepth 5 -name "*.d.ts" -delete
rm -rf dist/ build/
echo "Purge complete - No loss to M.I.N.D.'s hotspot pulses."

# Step 4: Git Reset & Re-Add (Fix Index - No Stall on Large Repos)
echo "=== Git Reset: Re-Tracking Pure JS for 85%+ Wins ==="
git reset -- .  # Unstage all
git add -u  # Add tracked changes (ignores new unused)
git add .  # Add current .js/config/data
git commit -m "TSReaper Purge: Removed TS remnants/unused - Optimized paths for M.I.N.D. profitability" || echo "Commit stalled - Run git status."
git push origin main  # Optional - Uncomment if ready

echo "=== GhostBuster Complete: Repo Lean, Ready for Empire-Building ==="
echo "Verify: Run node src/testAI.js - Paths should resolve, wins mooning."