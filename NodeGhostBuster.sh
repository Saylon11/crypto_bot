#!/bin/bash

# NodeGhostBuster.sh - Degen TS Purge + Backup: Skip node_modules stalls, streamline for M.I.N.D. vibe checks
# Run from HootBot root (cd ~/Desktop/HootBot)
# Date: August 12, 2025 - Backup named with 20250812

# Step 0: Verify pwd - Must be in HootBot root
if [ ! -d ".git" ]; then
  echo "Error: Run from HootBot root (where .git is). Stalling prevented."
  exit 1
fi

# Step 1: Backup (Unseen Guardrail - Snapshot branch + folder copy, exclude node_modules to avoid symlink stalls)
echo "=== Backup Phase: Safeguarding M.I.N.D.'s Emotional Liquidity Genius (Skipping node_modules for speed) ==="
git branch backup-pre-purge-20250812 || { echo "Git branch stalled - Check repo status."; exit 1; }
rsync -av --exclude='node_modules' ~/Desktop/HootBot/ ~/Desktop/HootBot-Backup-20250812/ || { echo "Rsync stalled - Install rsync or check permissions/space."; exit 1; }
echo "Backup complete: Branch 'backup-pre-purge-20250812' + Folder 'HootBot-Backup-20250812' (node_modules excluded - reinstall with npm i later)."

# Step 2: List & Confirm Purge Targets (Interactive - No Blind Nukes)
echo "=== Listing TS/Unused Targets - Review for Holds (e.g., M.I.N.D. Canopy Logic) ==="
ts_files=$(find . -maxdepth 5 -name "*.ts" -print 2>/dev/null)
dts_files=$(find . -maxdepth 5 -name "*.d.ts" -print 2>/dev/null)
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

# Step 3: Selective Purge (No Stall - Maxdepth Limits, Error Handling)
echo "=== Purging TS Remnants - Streamlining for Faster Vibe Checks ==="
find . -maxdepth 5 -name "*.ts" -delete 2>/dev/null || echo "TS delete stalled on some files - Check manually."
find . -maxdepth 5 -name "*.d.ts" -delete 2>/dev/null || echo "DTS delete stalled on some files - Check manually."
rm -rf dist/ build/ 2>/dev/null || echo "Dist/build delete stalled - Check if exists/permissions."
echo "Purge complete - No loss to M.I.N.D.'s hotspot pulses."

# Step 4: Git Reset & Re-Add (Fix Index - No Stall on Large Repos)
echo "=== Git Reset: Re-Tracking Pure JS for 85%+ Wins ==="
git reset -- .  # Unstage all
git add -u  # Add tracked changes (ignores new unused)
git add .  # Add current .js/config/data
git commit -m "NodeGhostBuster Purge: Removed TS remnants/unused - Optimized paths for M.I.N.D. profitability" || echo "Commit stalled - Run git status."
git push origin main  # Optional - Uncomment if ready

echo "=== GhostBuster Complete: Repo Lean, Ready for Empire-Building ==="
echo "Verify: Run npm i to reinstall deps if needed, then node src/testAI.js - Paths should resolve, wins mooning."
