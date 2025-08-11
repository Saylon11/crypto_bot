// HootBot/scripts/migrateToHeliusPro.ts

import * as fs from 'fs';
import * as path from 'path';

// Files to update with new imports
const filesToUpdate = [
  'src/pumpTools/pumpBot.ts',
  'src/pumpTools/copyTrader.ts',
  'src/scanners/tokenHunter.ts',
  'src/pumpTools/raidHootBot.ts',
  'src/pumpTools/tradeExecutor.ts'
];

// New import statements to add
const newImports = `import { 
  getHeliusConnection, 
  sendTransactionSafe,
  getDynamicPriorityFee 
} from '../utils/heliusConnection';
import { getEnhancedExecutor } from './enhancedTradeExecutor';`;

// Update connection instantiation patterns
const connectionPatterns = [
  {
    old: /new Connection\([^)]+\)/g,
    new: 'getHeliusConnection()'
  },
  {
    old: /const connection = new Connection\([^;]+;/g,
    new: 'const connection = getHeliusConnection();'
  }
];

// Update transaction sending patterns
const transactionPatterns = [
  {
    old: /connection\.sendTransaction\(/g,
    new: 'sendTransactionSafe('
  },
  {
    old: /connection\.sendRawTransaction\(/g,
    new: 'connection.sendRawTransaction(' // Keep raw for now
  }
];

// Migrate files
export async function migrateToHeliusPro() {
  console.log('🚀 Starting migration to Helius Professional...\n');

  // Create backup directory
  const backupDir = path.join(process.cwd(), 'backup', new Date().toISOString());
  fs.mkdirSync(backupDir, { recursive: true });

  for (const filePath of filesToUpdate) {
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${filePath} (not found)`);
      continue;
    }

    console.log(`📝 Updating ${filePath}...`);

    // Backup original file
    const backupPath = path.join(backupDir, path.basename(filePath));
    fs.copyFileSync(fullPath, backupPath);

    // Read file content
    let content = fs.readFileSync(fullPath, 'utf-8');

    // Add new imports if not already present
    if (!content.includes('heliusConnection')) {
      const importIndex = content.indexOf('import');
      if (importIndex !== -1) {
        const firstImportEnd = content.indexOf('\n', importIndex);
        content = content.slice(0, firstImportEnd + 1) + 
                 newImports + '\n' + 
                 content.slice(firstImportEnd + 1);
      }
    }

    // Apply connection patterns
    connectionPatterns.forEach(pattern => {
      content = content.replace(pattern.old, pattern.new);
    });

    // Apply transaction patterns
    transactionPatterns.forEach(pattern => {
      content = content.replace(pattern.old, pattern.new);
    });

    // Write updated content
    fs.writeFileSync(fullPath, content);
    console.log(`✅ Updated ${filePath}`);
  }

  console.log('\n✅ Migration complete!');
  console.log(`📁 Backups saved to: ${backupDir}`);
}

// Create package.json updates
export function updatePackageJson() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));

  // Add new scripts
  packageJson.scripts = {
    ...packageJson.scripts,
    'raid:enhanced': 'ts-node src/pumpTools/enhancedRaidHootBot.ts',
    'trade:enhanced': 'ts-node src/pumpTools/enhancedTradeExecutor.ts',
    'migrate:helius': 'ts-node scripts/migrateToHeliusPro.ts'
  };

  // Add new dependencies if needed
  if (!packageJson.dependencies['solana-smart-rpc']) {
    packageJson.dependencies['solana-smart-rpc'] = '^1.0.0';
  }

  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  console.log('✅ Updated package.json');
}

// Run migration if executed directly
if (require.main === module) {
  migrateToHeliusPro()
    .then(() => updatePackageJson())
    .catch(console.error);
}