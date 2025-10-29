import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import dotenv from 'dotenv';

dotenv.config();

async function checkWalletBalances() {
  // Use public RPC if Helius fails
  const rpcUrl = process.env.QUICKNODE_RPC_URL || 'https://api.mainnet-beta.solana.com';
  console.log(`Using RPC: ${rpcUrl}\n`);
  const connection = new Connection(rpcUrl);
  
  console.log("🦉 HOOTBOT RAID WALLET STATUS 🦉\n");
  
  const wallets = [
    { name: "Shock Trader (W1)", key: process.env.RAID_WALLET_1, requiredSol: 3.5 },
    { name: "Early FOMO (W2)", key: process.env.RAID_WALLET_2, requiredSol: 1.5 },
    { name: "Momentum Builder (W3)", key: process.env.RAID_WALLET_3, requiredSol: 1.5 },
    { name: "Late Surge (W4)", key: process.env.RAID_WALLET_4, requiredSol: 1.5 },
    { name: "Bond Finisher (W5)", key: process.env.RAID_WALLET_5, requiredSol: 2.0 }
  ];
  
  let totalBalance = 0;
  let readyWallets = 0;
  const requiredTotal = 10;
  
  for (const wallet of wallets) {
    try {
      if (!wallet.key) {
        console.log(`❌ ${wallet.name}: ERROR - Key not found in environment`);
        continue;
      }
      
      const keypair = Keypair.fromSecretKey(bs58.decode(wallet.key));
      const balance = await connection.getBalance(keypair.publicKey);
      const balanceInSol = balance / 1e9;
      totalBalance += balanceInSol;
      
      const status = balanceInSol >= wallet.requiredSol + 0.1 ? "✅" : "❌";
      if (status === "✅") readyWallets++;
      
      console.log(`${status} ${wallet.name}: ${balanceInSol.toFixed(3)} SOL (needs ${wallet.requiredSol} + gas)`);
      console.log(`   Address: ${keypair.publicKey.toString()}`);
      
    } catch (error) {
      console.log(`❌ ${wallet.name}: ERROR - ${error instanceof Error ? error.message : 'Check private key'}`);
    }
  }
  
  console.log("\n📊 SUMMARY:");
  console.log(`Total Balance: ${totalBalance.toFixed(2)} SOL`);
  console.log(`Ready Wallets: ${readyWallets}/5`);
  console.log(`Required: ${requiredTotal} SOL + ~0.5 SOL gas`);
  
  if (readyWallets === 5 && totalBalance >= requiredTotal + 0.5) {
    console.log("\n✅ ALL SYSTEMS GO! Ready to raid! 🚀");
    console.log("Run: npm run raid:execute");
  } else {
    console.log("\n⚠️  Not ready yet. Please fund all wallets with required amounts + gas");
  }
}

checkWalletBalances().catch(console.error);