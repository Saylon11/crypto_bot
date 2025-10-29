// fixTradeExecution.js - Remove pump.fun and use Jupiter/Raydium directly
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Trade Execution - Removing Pump.fun\n');
console.log('=' .repeat(60));

// Read tradeExecutor.js
const tradeExecutorPath = path.join(__dirname, 'src/pumpTools/tradeExecutor.js');
let content = fs.readFileSync(tradeExecutorPath, 'utf8');

// Create new simplified tradeExecutor without pump.fun
const newTradeExecutor = `// HootBot Trade Executor - Jupiter/Raydium Direct
const { Connection, PublicKey, Transaction, LAMPORTS_PER_SOL, VersionedTransaction } = require('@solana/web3.js');
const fetch = require('node-fetch');
const bs58 = require('bs58');
const dotenv = require('dotenv');

dotenv.config();

// Get wallet
function getWallet() {
  const fs = require('fs');
  const { Keypair } = require('@solana/web3.js');
  
  // Try keypair file first
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (keypairPath && fs.existsSync(keypairPath)) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  }
  
  // Fall back to base58
  const secretKey = process.env.WALLET_SECRET_KEY;
  if (!secretKey) throw new Error('No wallet configured');
  
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

// Get connection
function getConnection() {
  const rpcUrl = process.env.HELIUS_RPC_URL || 
    (process.env.HELIUS_API_KEY ? \`https://mainnet.helius-rpc.com/?api-key=\${process.env.HELIUS_API_KEY}\` : 'https://api.mainnet-beta.solana.com');
  
  return new Connection(rpcUrl, 'confirmed');
}

// Execute Jupiter swap
async function executeJupiterSwap(tokenMint, amountSol, isBuy = true) {
  try {
    const wallet = getWallet();
    const connection = getConnection();
    
    console.log(\`\n🪐 Executing Jupiter swap:\`);
    console.log(\`   Type: \${isBuy ? 'BUY' : 'SELL'}\`);
    console.log(\`   Token: \${tokenMint}\`);
    console.log(\`   Amount: \${amountSol} SOL\`);
    
    const SOL_MINT = 'So11111111111111111111111111111111111111112';
    const inputMint = isBuy ? SOL_MINT : tokenMint;
    const outputMint = isBuy ? tokenMint : SOL_MINT;
    const amount = Math.floor(amountSol * LAMPORTS_PER_SOL);
    
    // Get quote
    const quoteResponse = await fetch(
      \`https://quote-api.jup.ag/v6/quote?inputMint=\${inputMint}&outputMint=\${outputMint}&amount=\${amount}&slippageBps=300\`
    );
    
    if (!quoteResponse.ok) {
      throw new Error(\`Quote failed: \${await quoteResponse.text()}\`);
    }
    
    const quoteData = await quoteResponse.json();
    console.log(\`   Expected output: \${(quoteData.outAmount / LAMPORTS_PER_SOL).toFixed(6)} tokens\`);
    
    // Get swap transaction
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: wallet.publicKey.toString(),
        wrapAndUnwrapSol: true,
        prioritizationFeeLamports: 'auto'
      })
    });
    
    if (!swapResponse.ok) {
      throw new Error(\`Swap failed: \${await swapResponse.text()}\`);
    }
    
    const swapData = await swapResponse.json();
    
    // Deserialize and sign transaction
    const swapTransactionBuf = Buffer.from(swapData.swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(swapTransactionBuf);
    transaction.sign([wallet]);
    
    // Send transaction
    console.log('   📤 Sending transaction...');
    const signature = await connection.sendTransaction(transaction);
    console.log(\`   ✅ Transaction sent: \${signature}\`);
    
    // Confirm
    await connection.confirmTransaction(signature, 'confirmed');
    console.log(\`   ✅ Swap confirmed!\`);
    console.log(\`   🔗 View: https://solscan.io/tx/\${signature}\`);
    
    return {
      success: true,
      signature,
      tokensReceived: quoteData.outAmount / LAMPORTS_PER_SOL
    };
    
  } catch (error) {
    console.error('❌ Jupiter swap error:', error.message);
    throw error;
  }
}

// Main buy function
async function initiateCoordinatedBuy(tokenMint, amountSol, skipMind = false) {
  console.log(\`\\n🎯 Executing buy for \${tokenMint}: \${amountSol} SOL\`);
  
  if (!tokenMint) {
    throw new Error('Token mint is required');
  }
  
  try {
    // Execute via Jupiter
    const result = await executeJupiterSwap(tokenMint, amountSol, true);
    
    console.log(\`✅ Buy successful! Received \${result.tokensReceived.toFixed(2)} tokens\`);
    return result;
    
  } catch (error) {
    console.error('Buy execution failed:', error.message);
    throw error;
  }
}

// Wrapper functions
module.exports = {
  initiateCoordinatedBuy,
  executeJupiterSwap,
  getConnection,
  
  executeBuy: async (tokenMint, amountSol, skipMindAnalysis = false) => {
    return await initiateCoordinatedBuy(tokenMint, amountSol, skipMindAnalysis);
  },
  
  executePanicBuy: async (tokenMint, multiplier = 10, skipMind = true) => {
    console.log(\`🚨 Panic buy with \${multiplier}x multiplier\`);
    return await initiateCoordinatedBuy(tokenMint, 0.05 * multiplier, skipMind);
  },
  
  executeIntelligentTrade: async (tokenMint, amountSol) => {
    return await initiateCoordinatedBuy(tokenMint, amountSol, false);
  }
};`;

// Backup and write new file
fs.writeFileSync(tradeExecutorPath + '.pump-backup', content);
fs.writeFileSync(tradeExecutorPath, newTradeExecutor);

console.log('✅ Removed all pump.fun code');
console.log('✅ Now using Jupiter API directly via Helius RPC');
console.log('✅ Simplified trade execution');

console.log('\n' + '=' .repeat(60));
console.log('🎯 Trade execution fixed!');
console.log('\nFeatures:');
console.log('- Direct Jupiter swaps (no pump.fun)');
console.log('- Uses your Helius RPC');
console.log('- Clean error handling');
console.log('- Works with any Solana token');

console.log('\nRun: node src/core/smartTrader.js');