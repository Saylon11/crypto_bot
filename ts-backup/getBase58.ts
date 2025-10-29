import * as fs from "fs";
import bs58 from "bs58";

// Update path to where the file actually is
const keypairPath = `/Users/owner/Desktop/HootBot/hootbot-keypair.json`;

if (!fs.existsSync(keypairPath)) {
  console.error(`Keypair not found at: ${keypairPath}`);
  process.exit(1);
}

const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));

// Convert first 32 bytes (private key) to base58
const privateKey = keypairData.slice(0, 32);
const base58Key = bs58.encode(Buffer.from(privateKey));

console.log("Your base58 private key:");
console.log(base58Key);
console.log("\nAdd this to .env:");
console.log(`WALLET_SECRET_KEY=${base58Key}`);