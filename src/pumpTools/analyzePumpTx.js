// analyzePumpTx.js - Analyze and replicate successful pump.fun transactions
const { 
    Connection, 
    PublicKey,
    Transaction,
    LAMPORTS_PER_SOL
  } = require('@solana/web3.js');
  const fetch = require('node-fetch');
  const bs58 = require('bs58');
  
  // Configuration
  const RPC_URL = 'https://api.mainnet-beta.solana.com';
  
  // Known pump.fun addresses
  const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
  
  async function analyzeTransaction(txSignature) {
    console.log('\n🔍 Analyzing Transaction:', txSignature);
    console.log('='.repeat(60));
    
    const connection = new Connection(RPC_URL, 'confirmed');
    
    try {
      // Fetch transaction details
      const tx = await connection.getParsedTransaction(txSignature, {
        maxSupportedTransactionVersion: 0
      });
      
      if (!tx) {
        throw new Error('Transaction not found');
      }
      
      console.log('\n📋 Transaction Overview:');
      console.log(`Block Time: ${new Date(tx.blockTime * 1000).toISOString()}`);
      console.log(`Slot: ${tx.slot}`);
      console.log(`Success: ${tx.meta.err === null ? '✅ Yes' : '❌ No'}`);
      console.log(`Fee: ${tx.meta.fee / LAMPORTS_PER_SOL} SOL`);
      
      // Find pump.fun instructions
      console.log('\n🎯 Pump.fun Instructions:');
      let pumpInstructionFound = false;
      
      tx.transaction.message.instructions.forEach((ix, index) => {
        if (ix.programId.toString() === PUMP_PROGRAM) {
          pumpInstructionFound = true;
          console.log(`\nInstruction #${index}:`);
          console.log(`Program: ${ix.programId.toString()}`);
          
          if (ix.parsed) {
            console.log('Parsed:', JSON.stringify(ix.parsed, null, 2));
          } else {
            console.log('Raw Data:', ix.data);
            
            // Decode raw instruction data
            if (ix.data) {
              const decoded = bs58.decode(ix.data);
              console.log('Decoded bytes:', Array.from(decoded));
              console.log('Hex:', decoded.toString('hex'));
              
              // Try to parse pump.fun buy instruction
              if (decoded.length >= 24) {
                const discriminator = decoded.slice(0, 8);
                const amount = decoded.readBigUInt64LE(8);
                const maxSolCost = decoded.readBigUInt64LE(16);
                
                console.log('\nDecoded Buy Instruction:');
                console.log(`Discriminator: ${discriminator.toString('hex')}`);
                console.log(`Amount: ${amount} (${Number(amount) / LAMPORTS_PER_SOL} SOL)`);
                console.log(`Max Sol Cost: ${maxSolCost} (${Number(maxSolCost) / LAMPORTS_PER_SOL} SOL)`);
                console.log(`Slippage: ${((Number(maxSolCost) / Number(amount) - 1) * 100).toFixed(2)}%`);
              }
            }
          }
          
          // Show accounts
          console.log('\nAccounts:');
          ix.accounts.forEach((acc, i) => {
            console.log(`  [${i}] ${acc.toString()}`);
          });
        }
      });
      
      if (!pumpInstructionFound) {
        console.log('❌ No pump.fun instructions found in this transaction');
      }
      
      // Get token transfers
      console.log('\n💰 Token Transfers:');
      const postBalances = tx.meta.postTokenBalances || [];
      const preBalances = tx.meta.preTokenBalances || [];
      
      postBalances.forEach((post, index) => {
        const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
        if (pre && post.uiTokenAmount.uiAmount !== pre.uiTokenAmount.uiAmount) {
          const change = post.uiTokenAmount.uiAmount - pre.uiTokenAmount.uiAmount;
          console.log(`Token: ${post.mint}`);
          console.log(`Change: ${change > 0 ? '+' : ''}${change}`);
          console.log(`Account: ${tx.transaction.message.accountKeys[post.accountIndex].pubkey.toString()}`);
        }
      });
      
      // Get SOL changes
      console.log('\n💸 SOL Changes:');
      tx.transaction.message.accountKeys.forEach((key, index) => {
        const preBalance = tx.meta.preBalances[index] / LAMPORTS_PER_SOL;
        const postBalance = tx.meta.postBalances[index] / LAMPORTS_PER_SOL;
        const change = postBalance - preBalance;
        
        if (Math.abs(change) > 0.0001) {
          console.log(`${key.pubkey.toString()}: ${change > 0 ? '+' : ''}${change.toFixed(4)} SOL`);
        }
      });
      
      // Extract full transaction for replication
      console.log('\n📦 Raw Transaction Data:');
      const rawTx = await connection.getTransaction(txSignature);
      if (rawTx) {
        console.log('Version:', rawTx.version || 'legacy');
        console.log('Recent Blockhash:', rawTx.transaction.message.recentBlockhash);
        
        // Get serialized format
        const serialized = rawTx.transaction.serialize();
        console.log('Serialized (base58):', bs58.encode(serialized));
        console.log('Size:', serialized.length, 'bytes');
      }
      
      return tx;
      
    } catch (error) {
      console.error('❌ Error analyzing transaction:', error.message);
      return null;
    }
  }
  
  async function findSuccessfulPumpBuys(walletAddress, limit = 10) {
    console.log(`\n🔎 Finding successful pump.fun buys for wallet: ${walletAddress}`);
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = new PublicKey(walletAddress);
    
    try {
      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(wallet, {
        limit: 100
      });
      
      console.log(`Found ${signatures.length} recent transactions`);
      
      let successfulBuys = [];
      
      for (const sig of signatures) {
        if (sig.err === null) {
          // Check if it's a pump.fun transaction
          const tx = await connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          
          if (tx && tx.transaction.message.instructions.some(ix => 
            ix.programId.toString() === PUMP_PROGRAM
          )) {
            // Check if it's a buy (SOL decreased, tokens increased)
            const accountIndex = tx.transaction.message.accountKeys.findIndex(
              k => k.pubkey.toString() === walletAddress
            );
            
            if (accountIndex !== -1) {
              const solChange = (tx.meta.postBalances[accountIndex] - tx.meta.preBalances[accountIndex]) / LAMPORTS_PER_SOL;
              
              if (solChange < -0.001) { // SOL decreased = likely a buy
                successfulBuys.push({
                  signature: sig.signature,
                  solSpent: Math.abs(solChange),
                  timestamp: new Date(tx.blockTime * 1000).toISOString()
                });
                
                if (successfulBuys.length >= limit) break;
              }
            }
          }
        }
      }
      
      console.log(`\n✅ Found ${successfulBuys.length} successful pump.fun buys:`);
      successfulBuys.forEach((buy, i) => {
        console.log(`${i + 1}. ${buy.signature}`);
        console.log(`   Amount: ${buy.solSpent.toFixed(4)} SOL`);
        console.log(`   Time: ${buy.timestamp}`);
      });
      
      return successfulBuys;
      
    } catch (error) {
      console.error('❌ Error finding transactions:', error.message);
      return [];
    }
  }
  
  // Main execution
  async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      console.log('Usage:');
      console.log('  node analyzePumpTx.js <transaction_signature>');
      console.log('  node analyzePumpTx.js find <wallet_address>');
      console.log('\nExample:');
      console.log('  node analyzePumpTx.js 5gwM2m9X5oTL2oF88UyXLNBWG8ABQF...');
      console.log('  node analyzePumpTx.js find 3BWwMDcyS1tFtGMzZ7kYWzukjuHvkLJJtuKuVMSHsp6D');
      return;
    }
    
    if (args[0] === 'find' && args[1]) {
      // Find successful transactions for a wallet
      await findSuccessfulPumpBuys(args[1]);
    } else {
      // Analyze specific transaction
      await analyzeTransaction(args[0]);
    }
  }
  
  main().catch(console.error);