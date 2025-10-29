import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import axios from 'axios';

// === CONFIG ===
const LOCAL_PATH = path.join(__dirname, 'metadata', 'OIL_COIN_Metadata_MKII.json');
const REMOTE_URL = 'https://raw.githubusercontent.com/Saylon11/oilc-metadata/main/public/metadata/oilc.json';

// === UTILS ===
function canonicalize(obj: any): string {
  return JSON.stringify(sortKeys(obj), null, 2);
}

function sortKeys(value: any): any {
  if (Array.isArray(value)) return value.map(sortKeys);
  else if (typeof value === 'object' && value !== null) {
    return Object.keys(value).sort().reduce((acc, key) => {
      acc[key] = sortKeys(value[key]);
      return acc;
    }, {} as any);
  }
  return value;
}

function sha256(text: string): string {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

// === MAIN ===
(async () => {
  try {
    const localRaw = fs.readFileSync(LOCAL_PATH, 'utf8');
    const localParsed = JSON.parse(localRaw);
    const localCanonical = canonicalize(localParsed);
    const localHash = sha256(localCanonical);

    const remoteRes = await axios.get(REMOTE_URL);
    const remoteParsed = remoteRes.data;
    const remoteCanonical = canonicalize(remoteParsed);
    const remoteHash = sha256(remoteCanonical);

    console.log(`🔐 Local Vault Hash:  ${localHash}`);
    console.log(`🌐 Remote GitHub Hash: ${remoteHash}\n`);

    if (localHash === remoteHash) {
      console.log('✅ Metadata MATCHES. oilc.json is synced with MKII vault.');
    } else {
      console.warn('❌ Metadata MISMATCH. oilc.json does NOT match MKII vault!');
      console.warn('→ Review differences manually or re-sync.');
    }

  } catch (err) {
    console.error('❌ Error during metadata comparison:', err);
  }
})();