const bs58 = require('bs58');
const { Keypair } = require('@solana/web3.js');

const privateKeyArray = [13,166,209,26,104,166,182,235,37,158,118,218,247,32,249,21,167,149,5,227,70,51,38,199,150,156,228,92,92,111,86,218,32,105,8,40,120,198,147,57,12,235,180,96,49,184,238,226,150,237,58,196,199,114,123,223,186,49,254,55,97,94,119,58];

const base58Key = bs58.encode(Buffer.from(privateKeyArray));
const keypair = Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
const publicKey = keypair.publicKey.toString();

console.log('🔑 HootBot Wallet Conversion:');
console.log(`Public Key: ${publicKey}`);
console.log(`Base58 Private Key: ${base58Key}`);
console.log('\n📋 Add to .env:');
console.log(`WALLET_SECRET_KEY=${base58Key}`);
console.log(`HOOTBOT_WALLET_ADDRESS=${publicKey}`);

const targetAddress = '3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D';
if (publicKey === targetAddress) {
    console.log('\n✅ PERFECT MATCH! This is your correct HootBot wallet!');
} else {
    console.log(`\n❌ Mismatch! Expected: ${targetAddress}, Got: ${publicKey}`);
}
