// HootBot/test-scanner.ts

import { walletManager } from './src/core/multiWalletManager';

async function testScannerComponents() {
  console.log("🧪 Testing HootBot Scanner Components...\n");

  // Test 1: Wallet Manager
  console.log("1️⃣ Testing MultiWalletManager...");
  try {
    const stats = walletManager.getWalletStats();
    console.log(`   ✅ Wallet pool: ${stats.totalWallets} wallets`);
    
    const wallet = await walletManager.getNextWallet();
    console.log(`   ✅ Selected wallet: ${wallet.publicKey.toBase58().slice(0, 8)}...`);
    
    walletManager.markWalletUsed(wallet);
    const newStats = walletManager.getWalletStats();
    console.log(`   ✅ Transaction count: ${newStats.totalTransactions}`);
  } catch (error) {
    console.log(`   ❌ Wallet test failed: ${error}`);
  }

  // Test 2: Mock Token Analysis
  console.log("\n2️⃣ Testing Token Analysis...");
  const mockToken = {
    mint: "BKjx5R9AuxXMUVM2hSxu1CkPSSdBCzJraMzEc8WZ7tvh",
    name: "Test Token",
    symbol: "TEST",
    marketCap: 150000,
    volume24h: 75000
  };

  const score = await calculateMockScore(mockToken);
  console.log(`   📊 Token: ${mockToken.symbol}`);
  console.log(`   📊 Market Cap: $${mockToken.marketCap?.toLocaleString()}`);
  console.log(`   📊 Volume 24h: $${mockToken.volume24h?.toLocaleString()}`);
  console.log(`   🧠 MIND Score: ${score}%`);

  if (score >= 90) {
    console.log(`   🔥 HIGH SCORE - Would execute BUY!`);
  } else if (score >= 75) {
    console.log(`   📊 Good score - Would monitor`);
  } else {
    console.log(`   📉 Low score - Would ignore`);
  }

  // Test 3: Mock Trade Execution
  console.log("\n3️⃣ Testing Trade Execution (Simulation)...");
  if (score >= 75) {
    try {
      const wallet = await walletManager.getNextWallet();
      console.log(`   💰 Executing TEST trade...`);
      console.log(`   🔸 Token: ${mockToken.mint}`);
      console.log(`   🔸 Wallet: ${wallet.publicKey.toBase58().slice(0, 8)}...`);
      console.log(`   🔸 Amount: 0.01 SOL`);
      
      // Simulate trade delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockTxId = Array.from({length: 64}, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      
      console.log(`   ✅ Trade simulated successfully!`);
      console.log(`   📝 TX: ${mockTxId.slice(0, 16)}...`);
      
      walletManager.markWalletUsed(wallet);
      
    } catch (error) {
      console.log(`   ❌ Trade simulation failed: ${error}`);
    }
  }

  console.log("\n📊 Final Statistics:");
  const finalStats = walletManager.getWalletStats();
  console.log(`   • Total wallets: ${finalStats.totalWallets}`);
  console.log(`   • Active wallets: ${finalStats.activeWallets}`);
  console.log(`   • Total transactions: ${finalStats.totalTransactions}`);
  console.log(`   • Avg per wallet: ${finalStats.averageTransactionsPerWallet.toFixed(2)}`);
  
  console.log("\n✅ Scanner component test complete!");
}

async function calculateMockScore(token: any): Promise<number> {
  let score = 50; // Base score
  
  // Market cap scoring
  if (token.marketCap && token.marketCap > 100000) score += 20;
  if (token.marketCap && token.marketCap > 1000000) score += 10;
  
  // Volume scoring
  if (token.volume24h && token.volume24h > 50000) score += 15;
  
  // Name/symbol quality
  if (token.name && token.name.length > 3 && token.name.length < 20) score += 5;
  if (token.symbol && token.symbol.length > 2 && token.symbol.length < 8) score += 5;
  
  // Random market sentiment simulation
  score += Math.floor(Math.random() * 20) - 10;
  
  return Math.max(0, Math.min(100, score));
}

// Run the test
testScannerComponents().catch(console.error);