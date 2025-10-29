// HootBot/migrateBots.ts
// Helper script to migrate bot files to new structure

import * as fs from 'fs';
import * as path from 'path';

const migrations = [
  // Raid bots
  {
    from: 'src/pumpTools/raidHootBot.ts',
    to: 'src/bots/raid/raidHootBot.ts',
    updateImports: [
      { old: './tradeExecutor', new: './tradeExecutor' },
      { old: '../utils/logger', new: '../../utils/logger' },
    ]
  },
  {
    from: 'src/pumpTools/raidScheduler.ts',
    to: 'src/bots/raid/raidScheduler.ts',
    updateImports: [
      { old: './raidHootBot', new: './raidHootBot' },
      { old: './tradeExecutor', new: './tradeExecutor' },
      { old: './raidConfig', new: '../config/raidConfig' },
      { old: '../utils/logger', new: '../../utils/logger' },
    ]
  },
  {
    from: 'src/pumpTools/raidConfig.ts',
    to: 'src/bots/config/raidConfig.ts',
  },
  {
    from: 'src/pumpTools/tradeExecutor.ts',
    to: 'src/bots/raid/tradeExecutor.ts',
    updateImports: [
      { old: '../mindClient', new: '../../mindClient' },
      { old: '../utils/', new: '../../utils/' },
    ]
  },
  
  // Telegram bot
  {
    from: 'src/pumpTools/telegramBot.ts',
    to: 'src/bots/telegram/telegramBot.ts',
    updateImports: [
      { old: './tradeExecutor', new: '../raid/tradeExecutor' },
      { old: './mindClient', new: '../../mindClient' },
      { old: '../mindEngine', new: '../../mindEngine' },
    ]
  },
];

async function migrate() {
  console.log('🦉 HootBot File Migration Assistant');
  console.log('===================================\n');
  
  console.log('📋 Files to migrate:');
  migrations.forEach((m, i) => {
    const exists = fs.existsSync(m.from);
    console.log(`${i + 1}. ${m.from} → ${m.to} ${exists ? '✅' : '❌ NOT FOUND'}`);
  });
  
  console.log('\n🚀 Starting migration...\n');
  
  for (const migration of migrations) {
    if (!fs.existsSync(migration.from)) {
      console.log(`⏭️  Skipping ${migration.from} (not found)`);
      continue;
    }
    
    console.log(`📄 Migrating ${path.basename(migration.from)}...`);
    
    try {
      // Read the file
      let content = fs.readFileSync(migration.from, 'utf-8');
      
      // Update imports if specified
      if (migration.updateImports) {
        migration.updateImports.forEach(update => {
          const importRegex = new RegExp(`from ['"]${update.old}['"]`, 'g');
          content = content.replace(importRegex, `from '${update.new}'`);
        });
        console.log(`   📝 Updated ${migration.updateImports.length} imports`);
      }
      
      // Ensure target directory exists
      const targetDir = path.dirname(migration.to);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      
      // Write to new location
      fs.writeFileSync(migration.to, content);
      console.log(`   ✅ Moved to ${migration.to}`);
      
      // Create backup of original
      const backupPath = migration.from + '.backup';
      fs.copyFileSync(migration.from, backupPath);
      console.log(`   💾 Backup created: ${backupPath}`);
      
      // Remove original
      fs.unlinkSync(migration.from);
      console.log(`   🗑️  Removed original file\n`);
      
    } catch (error) {
      console.error(`   ❌ Error: ${error}\n`);
    }
  }
  
  console.log('\n✅ Migration complete!');
}

// Run migration
if (require.main === module) {
  migrate().catch(console.error);
}
