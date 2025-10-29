// archiveCleanup.js - Safe cleanup script for HootBot
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const ARCHIVE_DIR = path.join(ROOT, 'archive');
const DEPRECATED_DIR = path.join(ARCHIVE_DIR, 'deprecated');
const EXPERIMENTS_DIR = path.join(ARCHIVE_DIR, 'experiments');
const BACKUPS_DIR = path.join(ARCHIVE_DIR, 'backups');

// Ensure archive directories exist
[DEPRECATED_DIR, EXPERIMENTS_DIR, BACKUPS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Files that are DEFINITELY safe to archive (unused/old)
const TO_ARCHIVE = {
  deprecated: [
    // Old test files
    'test-scanner.ts',
    'testScanner.js',
    'testImplementation.js',
    'testConnection.js',
    'improvedSniper.js',
    'instantTrade.js',
    
    // Old configurations
    'config.json',
    'tsconfig.json',
    'ecosystem.config.js',
    
    // Duplicate/old traders
    'mindTrader.js',
    'mindTraderWithScanner.js',
    'smartTraderBridge.js',
    'smartTraderPump.js',
    
    // Old tools
    'splitWallet.js',
    'phasedSplit.js',
    
    // Analysis scripts we just created (not integrated yet)
    'analyzeLastNight.js',
    'deepDiveAnalysis.js',
    'aiLearningPipeline.js'
  ],
  
  experiments: [
    // Experimental features
    'src/profitSniperIntegration.js',
    'src/realTimeRiskMonitor.js',
    'src/profitSniper.js',
    
    // Test modules
    'src/modules/mindScannerIntegration.js'
  ],
  
  backups: [
    // Backup files
    'src/mindEngine.js.backup',
    'src/pumpTools/smartTrader.js.backup',
    'src/pumpTools/smartTrader.ts.backup',
    'src/pumpTools/tradeExecutor.js.backup',
    'src/pumpTools/tradeExecutor.ts.backup',
    'src/pumpTools/telegramBot.ts.backup',
    'src/pumpTools/raidHootBot.ts.backup',
    '.env.backup'
  ]
};

// Files to KEEP (actively used)
const KEEP_FILES = [
  // Core files
  'smartTrader.js',
  'src/mindEngine.js',
  'src/sessionAnalyzer.js',
  
  // Trading execution
  'src/pumpTools/tradeExecutor.js',
  'src/pumpTools/sellExecutor.js',
  
  // Scanners
  'src/modules/geckoScanner.js',
  'src/modules/tokenScanner.js',
  
  // MIND modules
  'src/modules/panicSellDetector.js',
  'src/modules/devWalletTracker.js',
  'src/modules/liquidityCycleMapper.js',
  'src/modules/herdSentimentAnalyzer.js',
  'src/modules/marketFlowAnalyzer.js',
  'src/modules/consumerProfileAnalyzer.js',
  'src/modules/devExhaustionDetector.js',
  'src/modules/regionalLiquidityMapper.js',
  'src/modules/survivabilityScore.js',
  'src/modules/walletProfiler.js',
  'src/modules/snapshotGenerator.js',
  
  // Utils
  'src/utils/apiClient.js',
  'src/utils/logger.js',
  'src/utils/mathUtils.js',
  'src/utils/timeUtils.js',
  
  // Environment files
  '.env',
  '.env.scanner',
  'package.json',
  'package-lock.json'
];

// Check if a file is imported by any active file
function checkIfImported(filename) {
  const activeFiles = KEEP_FILES.filter(f => f.endsWith('.js'));
  
  for (const activeFile of activeFiles) {
    if (!fs.existsSync(activeFile)) continue;
    
    try {
      const content = fs.readFileSync(activeFile, 'utf8');
      const basename = path.basename(filename, path.extname(filename));
      
      // Check for various import patterns
      if (content.includes(`require('${filename}')`) ||
          content.includes(`require("${filename}")`) ||
          content.includes(`require('./${filename}')`) ||
          content.includes(`require("./${filename}")`) ||
          content.includes(`from '${filename}'`) ||
          content.includes(`from "${filename}"`) ||
          content.includes(basename)) {
        return true;
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }
  
  return false;
}

// Archive files
function archiveFiles() {
  console.log('🧹 HootBot Cleanup Script\n');
  console.log('=' .repeat(60));
  
  let movedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  // Process each category
  Object.entries(TO_ARCHIVE).forEach(([category, files]) => {
    console.log(`\n📁 Processing ${category}:`);
    
    files.forEach(file => {
      const sourcePath = path.join(ROOT, file);
      
      if (!fs.existsSync(sourcePath)) {
        console.log(`   ⏭️  ${file} - Not found, skipping`);
        skippedCount++;
        return;
      }
      
      // Double-check if file is imported
      if (checkIfImported(file)) {
        console.log(`   ⚠️  ${file} - Still imported by active files, skipping`);
        skippedCount++;
        return;
      }
      
      // Determine destination
      let destDir;
      switch (category) {
        case 'deprecated':
          destDir = DEPRECATED_DIR;
          break;
        case 'experiments':
          destDir = EXPERIMENTS_DIR;
          break;
        case 'backups':
          destDir = BACKUPS_DIR;
          break;
      }
      
      const destPath = path.join(destDir, path.basename(file));
      
      try {
        // Move the file
        fs.renameSync(sourcePath, destPath);
        console.log(`   ✅ ${file} → archive/${category}/`);
        movedCount++;
      } catch (error) {
        console.error(`   ❌ ${file} - Error: ${error.message}`);
        errorCount++;
      }
    });
  });
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 Cleanup Summary:');
  console.log(`   ✅ Moved: ${movedCount} files`);
  console.log(`   ⏭️  Skipped: ${skippedCount} files`);
  console.log(`   ❌ Errors: ${errorCount} files`);
  
  // List remaining files in root
  console.log('\n📁 Remaining files in root directory:');
  const rootFiles = fs.readdirSync(ROOT)
    .filter(f => fs.statSync(path.join(ROOT, f)).isFile())
    .filter(f => !f.startsWith('.git'));
  
  rootFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  
  console.log('\n✅ Cleanup complete!');
  console.log('\nNext steps:');
  console.log('1. Run: node updatePaths.js (to fix import paths)');
  console.log('2. Test: node smartTrader.js (to ensure everything works)');
}

// Confirmation prompt
console.log('⚠️  This script will move old/unused files to the archive folder.');
console.log('   Active files will be preserved.\n');
console.log('Files to be archived:');
console.log('- Test files and old experiments');
console.log('- Backup files (.backup extensions)');
console.log('- Duplicate trader scripts');
console.log('- Unused configuration files\n');

const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Proceed with cleanup? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    archiveFiles();
  } else {
    console.log('Cleanup cancelled.');
  }
  rl.close();
});
