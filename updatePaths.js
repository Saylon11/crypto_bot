// updatePaths.js - Fix all import paths after reorganization
const fs = require('fs');
const path = require('path');

// Path mappings after reorganization
const PATH_UPDATES = {
  // Core modules
  "./dist/mindEngine": "./src/core/mindEngine",
  "./src/mindEngine": "./src/core/mindEngine",
  "../mindEngine": "./src/core/mindEngine",
  
  "./dist/pumpTools/tradeExecutor": "./src/trading/tradeExecutor",
  "./src/pumpTools/tradeExecutor": "./src/trading/tradeExecutor",
  
  "./dist/pumpTools/sellExecutor": "./src/trading/sellExecutor",
  "./src/pumpTools/sellExecutor": "./src/trading/sellExecutor",
  
  // Scanner modules
  "./dist/pumpTools/tokenScanner": "./src/scanners/tokenScanner",
  "./src/modules/tokenScanner": "./src/scanners/tokenScanner",
  "./src/modules/geckoScanner": "./src/scanners/geckoScanner",
  
  // Session analyzer
  "./src/sessionAnalyzer": "./src/core/sessionAnalyzer",
  
  // Analysis modules (MIND)
  "./modules/": "./src/analysis/",
  "../modules/": "./src/analysis/",
  
  // Utils
  "../utils/": "./src/utils/",
  "./utils/": "./src/utils/"
};

// Files to update
const FILES_TO_UPDATE = [
  'smartTrader.js',
  'src/core/mindEngine.js',
  'src/core/sessionAnalyzer.js',
  'src/trading/tradeExecutor.js',
  'src/trading/sellExecutor.js',
  'src/scanners/tokenScanner.js',
  'src/scanners/geckoScanner.js'
];

function updateImportPaths() {
  console.log('🔧 Updating Import Paths\n');
  console.log('=' .repeat(60));
  
  let totalUpdates = 0;
  
  FILES_TO_UPDATE.forEach(file => {
    if (!fs.existsSync(file)) {
      console.log(`⏭️  ${file} - Not found, skipping`);
      return;
    }
    
    console.log(`\n📄 Processing: ${file}`);
    
    let content = fs.readFileSync(file, 'utf8');
    let updates = 0;
    
    // Update each path mapping
    Object.entries(PATH_UPDATES).forEach(([oldPath, newPath]) => {
      // Count occurrences
      const regex = new RegExp(oldPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      const matches = content.match(regex);
      
      if (matches) {
        content = content.replace(regex, newPath);
        updates += matches.length;
        console.log(`   ✅ Updated: ${oldPath} → ${newPath} (${matches.length} times)`);
      }
    });
    
    if (updates > 0) {
      // Backup original
      fs.writeFileSync(`${file}.backup`, fs.readFileSync(file, 'utf8'));
      
      // Write updated content
      fs.writeFileSync(file, content);
      console.log(`   💾 Saved with ${updates} path updates`);
      totalUpdates += updates;
    } else {
      console.log(`   ℹ️  No path updates needed`);
    }
  });
  
  console.log('\n' + '=' .repeat(60));
  console.log(`✅ Path update complete! Total updates: ${totalUpdates}`);
  
  // Create a paths config file for future use
  const pathsConfig = `// config/paths.js - Centralized path configuration
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  // Root directories
  ROOT,
  SRC: path.join(ROOT, 'src'),
  CONFIG: path.join(ROOT, 'config'),
  DATA: path.join(ROOT, 'data'),
  SCRIPTS: path.join(ROOT, 'scripts'),
  
  // Source subdirectories
  CORE: path.join(ROOT, 'src/core'),
  TRADING: path.join(ROOT, 'src/trading'),
  SCANNERS: path.join(ROOT, 'src/scanners'),
  ANALYSIS: path.join(ROOT, 'src/analysis'),
  UTILS: path.join(ROOT, 'src/utils'),
  
  // Data subdirectories
  LOGS: path.join(ROOT, 'data/logs'),
  MODELS: path.join(ROOT, 'data/models'),
  CACHE: path.join(ROOT, 'data/cache'),
  
  // Helper function to resolve paths
  resolve: (...segments) => path.join(ROOT, ...segments)
};`;
  
  // Ensure config directory exists
  if (!fs.existsSync('config')) {
    fs.mkdirSync('config');
  }
  
  fs.writeFileSync('config/paths.js', pathsConfig);
  console.log('\n📄 Created config/paths.js for future path management');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Test the main script: node smartTrader.js');
  console.log('2. If any "module not found" errors, check the path in the error');
  console.log('3. The .backup files are created for each modified file');
}

// Run the update
updateImportPaths();