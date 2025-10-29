import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';

// === CONFIG ===
// Updated path: points to src/devTools/metadata/OIL_COIN_Metadata_MKII.json
const FILE_PATH = path.join(__dirname, 'metadata', 'OIL_COIN_Metadata_MKII.json');

// === STEP 1: Read & Canonicalize JSON ===
function canonicalize(obj: any): string {
  return JSON.stringify(sortKeys(obj), null, 2);
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  } else if (typeof value === 'object' && value !== null) {
    return Object.keys(value)
      .sort()
      .reduce((result: any, key) => {
        result[key] = sortKeys(value[key]);
        return result;
      }, {});
  }
  return value;
}

// === STEP 2: Hash JSON ===
function hashCanonicalJson(json: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(json, 'utf8');
  return hash.digest('hex');
}

// === MAIN EXECUTION ===
try {
  const rawJson = fs.readFileSync(FILE_PATH, 'utf8');
  const parsed = JSON.parse(rawJson);
  const canonicalJson = canonicalize(parsed);
  const sha256 = hashCanonicalJson(canonicalJson);

  console.log(`✅ SHA-256 hash of OIL_COIN_Metadata_MKII.json:`);
  console.log(`🔐 ${sha256}`);
  console.log(`\nUse this in your vault_signature if publishing publicly.`);
} catch (error) {
  console.error('❌ Error verifying metadata:', error);
}