// HootBot/src/pumpTools/sellAllPositions.js
// Emergency sell-all function to exit all positions

const { Connection, PublicKey } = require('@solana/web3.js');
const { getTokenAccounts } = require('@solana/spl-token');
const dotenv = require('dotenv');

dotenv.config();

async function sellAllPositions() {
  console.log('\n🚨 === SELL ALL POSITIONS INITIATED ===\n');
  
  const connection = new Connection(
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'confirmed'
  );
  
  const walletAddress = process.env.HOOTBOT_WALLET_ADDRESS || '3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D';
  
  try {
    // Get all token accounts for the wallet
    console.log('🔍 Scanning wallet for all token positions...');
    
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      new PublicKey(walletAddress),
      { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
    );
    
    if (tokenAccounts.value.length === 0) {
      console.log('✅ No token positions found - wallet only contains SOL');
      return;
    }
    
    console.log(`\n📊 Found ${tokenAccounts.value.length} token accounts:\n`);
    
    const positions = [];
    
    // List all positions
    for (const account of tokenAccounts.value) {
      const parsedInfo = account.account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount;
      
      if (balance > 0) {
        const mint = parsedInfo.mint;
        positions.push({
          mint: mint,
          balance: balance,
          decimals: parsedInfo.tokenAmount.decimals
        });
        
        console.log(`🪙 Token: ${mint}`);
        console.log(`   Balance: ${balance}`);
        console.log('');
      }
    }
    
    if (positions.length === 0) {
      console.log('✅ No active positions to sell');
      return;
    }
    
    console.log(`\n⚠️  READY TO SELL ${positions.length} POSITIONS\n`);
    console.log('📱 MANUAL SELL REQUIRED - Use one of these methods:\n');
    console.log('1️⃣  Phantom Wallet:');
    console.log('    • Open Phantom → Click token → Swap → Max → Swap to SOL\n');
    
    console.log('2️⃣  Raydium.io:');
    console.log('    • Go to raydium.io/swap');
    console.log('    • Connect wallet');
    console.log('    • Select each token → Max → Swap to SOL\n');
    
    console.log('3️⃣  Jupiter Aggregator:');
    console.log('    • Go to jup.ag');
    console.log('    • Connect wallet');
    console.log('    • For each token → Max → Swap to SOL\n');
    
    console.log('💡 TIP: Jupiter often gives the best rates!\n');
    
    // Save positions to file for reference
    const fs = require('fs');
    const positionsFile = `positions_to_sell_${Date.now()}.json`;
    fs.writeFileSync(positionsFile, JSON.stringify(positions, null, 2));
    console.log(`📄 Position list saved to: ${positionsFile}`);
    
    return positions;
    
  } catch (error) {
    console.error('❌ Error getting positions:', error.message);
  }
}

// Standalone execution
if (require.main === module) {
  console.log('🦉 HootBot Emergency Sell-All\n');
  
  sellAllPositions()
    .then(() => {
      console.log('\n✅ Sell-all scan complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { sellAllPositions };