import * as fs from 'fs';
import * as path from 'path';

// === FILE LOCATIONS ===
const mk2Path = path.join(__dirname, 'metadata', 'OIL_COIN_Metadata_MKII.json');
const publicPath = path.join(__dirname, 'metadata', 'oilc.json');

// === SYNC FUNCTION ===
try {
  const data = fs.readFileSync(mk2Path, 'utf8');
  fs.writeFileSync(publicPath, data, 'utf8');
  console.log('✅ oilc.json successfully synced from MKII metadata.');
} catch (err) {
  console.error('❌ Sync failed:', err);
}