import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import axios from 'axios';

// === CONFIG ===
const mk2Path = path.join(__dirname, 'metadata', 'OIL_COIN_Metadata_MKII.json');
const proofURL = 'https://raw.githubusercontent.com/Saylon11/oilc-metadata/main/public/metadata/vault_signature_proof.json';

// === HELPERS ===
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

function hash(json: any): string {
  const canonical = JSON.stringify(sortKeys(json), null, 2);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

// === MAIN ===
(async () => {
  try {
    const mk2Raw = fs.readFileSync(mk2Path, 'utf8');
    const mk2Json = JSON.parse(mk2Raw);
    const mk2Hash = hash(mk2Json);

    const proofRes = await axios.get(proofURL);
    const proof = proofRes.data;

    console.log(`🔐 Local MKII Hash:    ${mk2Hash}`);
    console.log(`📜 Proof File SHA256: ${proof.sha256}`);

    if (mk2Hash === proof.sha256) {
      console.log('✅ Vault proof matches MKII metadata.');
    } else {
      console.warn('❌ Proof mismatch. Consider regenerating the proof file.');
    }
  } catch (err) {
    console.error('❌ Validation failed:', err);
  }
})();