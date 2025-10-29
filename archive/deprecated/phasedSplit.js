// phasedSplit.js - Strategic phased distribution for natural optics
const { 
    Connection, 
    Keypair, 
    PublicKey, 
    Transaction,
    sendAndConfirmTransaction,
    SystemProgram,
    LAMPORTS_PER_SOL
  } = require('@solana/web3.js');
  const { 
    TOKEN_PROGRAM_ID,
    createTransferInstruction,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    getAccount
  } = require('@solana/spl-token');
  const fs = require('fs');
  const bs58 = require('bs58');
  require('dotenv').config();
  
  // Your whale wallet
  const WHALE_WALLET_KEY = 'y31AJw6fGDVdwLwC9gGaQWR2f1f1G7JihvdR7gqgHjQ6cz7uNCkq2VRMdrkfVoZKFG5be3y4yZ1AXkAnQhwSLRh';
  const FATBEAR_MINT = new PublicKey(process.env.TARGET_TOKEN_MINT); // Correct FATBEAR mint
  const TOTAL_TOKENS = 81_650_000;
  
  // PHASED DISTRIBUTION STRATEGY
  const PHASES = {
    // PHASE 1: Initial "whale friends" - Tonight late night
    phase1: {
      name: "Initial Distribution",
      optimalTime: "Tonight 2-4 AM EST",
      distributions: [
        { amount: 12_000_000, label: "Early Supporter 1", personality: "DeFi Veteran" },
        { amount: 10_000_000, label: "Early Supporter 2", personality: "Meme Collector" },
        { amount: 8_000_000, label: "Early Supporter 3", personality: "Community Builder" }
      ],
      totalAmount: 30_000_000, // ~37% of total
      postActions: [
        "Have wallet 1 make a small buy after receiving",
        "Have wallet 2 interact with other meme tokens",
        "Have wallet 3 send small amounts to known community addresses"
      ]
    },
    
    // PHASE 2: Community distribution - Weekend morning
    phase2: {
      name: "Community Growth",
      optimalTime: "Saturday 7-9 AM EST",
      distributions: [
        { amount: 5_000_000, label: "Community Member 1", personality: "Active Trader" },
        { amount: 4_500_000, label: "Community Member 2", personality: "Holder" },
        { amount: 4_000_000, label: "Community Member 3", personality: "Influencer Friend" },
        { amount: 3_500_000, label: "Community Member 4", personality: "Early Discord Member" },
        { amount: 3_000_000, label: "Community Member 5", personality: "Twitter Supporter" }
      ],
      totalAmount: 20_000_000, // ~25% of total
      postActions: [
        "Split from Phase 1 wallets, not main wallet",
        "Have some wallets buy small amounts",
        "Create some wallet-to-wallet transfers for activity"
      ]
    },
    
    // PHASE 3: Retail distribution - Next week
    phase3: {
      name: "Retail Wave",
      optimalTime: "Tuesday/Wednesday various times",
      distributions: [
        // 15 smaller wallets
        ...Array(15).fill(null).map((_, i) => ({
          amount: 2_000_000 + Math.floor(Math.random() * 1_000_000),
          label: `Retail Holder ${i + 1}`,
          personality: "Organic Buyer"
        }))
      ],
      totalAmount: 31_650_000, // Remaining balance
      postActions: [
        "These come from Phase 1 & 2 wallets",
        "Varying amounts for natural look",
        "Some wallets remain dormant, others trade actively"
      ]
    }
  };
  
  // Helper to save phase data
  function savePhaseData(phase, wallets, phaseNum) {
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const filename = `phase${phaseNum}-wallets-${timestamp}.json`;
    
    const data = {
      phase: phase.name,
      executedAt: new Date().toISOString(),
      optimalTime: phase.optimalTime,
      wallets: wallets,
      postActions: phase.postActions,
      totalDistributed: phase.totalAmount
    };
    
    // Save to multiple locations
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    fs.writeFileSync(`phase${phaseNum}-latest.json`, JSON.stringify(data, null, 2));
    
    if (!fs.existsSync('./wallet-phases')) {
      fs.mkdirSync('./wallet-phases');
    }
    fs.writeFileSync(`./wallet-phases/${filename}`, JSON.stringify(data, null, 2));
    
    console.log(`💾 Phase ${phaseNum} data saved to multiple locations`);
    
    return data;
  }
  
  async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Load previous phase wallets
  function loadPhaseWallets(phaseNum) {
    try {
      const data = JSON.parse(fs.readFileSync(`phase${phaseNum}-latest.json`, 'utf-8'));
      return data.wallets.map(w => ({
        keypair: Keypair.fromSecretKey(bs58.decode(w.privateKey)),
        ...w
      }));
    } catch {
      return null;
    }
  }
  
  async function executePhase(phaseNum, sourceWalletKey) {
    const phase = PHASES[`phase${phaseNum}`];
    console.log(`\n🚀 PHASE ${phaseNum}: ${phase.name}`);
    console.log('=' . repeat(60));
    console.log(`📅 Optimal execution time: ${phase.optimalTime}`);
    console.log(`💰 Total to distribute: ${phase.totalAmount.toLocaleString()} tokens`);
    
    // Load source wallet
    let sourceWallet;
    let sourceLabel;
    
    if (phaseNum === 1) {
      // Phase 1 uses main whale wallet
      sourceWallet = Keypair.fromSecretKey(bs58.decode(sourceWalletKey || WHALE_WALLET_KEY));
      sourceLabel = "Main Whale Wallet";
    } else {
      // Later phases use previous phase wallets
      console.log(`\n📂 Loading Phase ${phaseNum - 1} wallets as sources...`);
      const previousWallets = loadPhaseWallets(phaseNum - 1);
      if (!previousWallets) {
        console.error(`❌ Must complete Phase ${phaseNum - 1} first!`);
        return;
      }
      // For demo, use first wallet from previous phase
      sourceWallet = previousWallets[0].keypair;
      sourceLabel = previousWallets[0].label;
    }
    
    console.log(`✅ Source wallet: ${sourceWallet.publicKey.toBase58()} (${sourceLabel})`);
    
    // Connection
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Check balance
    const balance = await connection.getBalance(sourceWallet.publicKey);
    console.log(`💰 SOL Balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    
    // Check if this is a dry run
    const isDryRun = process.argv.includes('--dry-run');
    
    console.log(`\n📋 Distribution Plan (${isDryRun ? 'DRY RUN' : 'LIVE'}):`);
    
    // Create wallets for this phase
    const wallets = [];
    for (const dist of phase.distributions) {
      const newWallet = Keypair.generate();
      wallets.push({
        keypair: newWallet,
        address: newWallet.publicKey.toBase58(),
        privateKey: bs58.encode(newWallet.secretKey),
        amount: dist.amount,
        label: dist.label,
        personality: dist.personality
      });
      console.log(`   ${dist.label} (${dist.personality}): ${dist.amount.toLocaleString()} → ${newWallet.publicKey.toBase58().slice(0, 8)}...`);
    }
    
    // Save phase data immediately
    if (!isDryRun) {
      savePhaseData(phase, wallets, phaseNum);
    }
    
    if (isDryRun) {
      console.log('\n✅ Dry run complete. No transactions sent.');
      console.log('\n📝 Post-distribution actions for this phase:');
      phase.postActions.forEach((action, i) => console.log(`   ${i + 1}. ${action}`));
      return;
    }
    
    // Execute transfers
    console.log('\n🔄 Starting transfers...');
    
    for (let i = 0; i < wallets.length; i++) {
      const wallet = wallets[i];
      console.log(`\n📤 Transfer ${i + 1}/${wallets.length}: ${wallet.label}`);
      
      try {
        // Fund with SOL
        console.log('   Funding with SOL...');
        const fundTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: sourceWallet.publicKey,
            toPubkey: wallet.keypair.publicKey,
            lamports: 0.02 * LAMPORTS_PER_SOL, // Extra SOL for future transactions
          })
        );
        
        await sendAndConfirmTransaction(connection, fundTx, [sourceWallet]);
        console.log('   ✅ Funded with 0.02 SOL');
        
        // Natural delay between funding and token transfer
        const delay = 30000 + Math.random() * 60000; // 30-90 seconds
        console.log(`   ⏱️  Waiting ${(delay / 1000).toFixed(1)}s (natural delay)...`);
        await sleep(delay);
        
        // Transfer tokens
        console.log('   Transferring tokens...');
        const sourceATA = await getAssociatedTokenAddress(FATBEAR_MINT, sourceWallet.publicKey);
        const targetATA = await getAssociatedTokenAddress(FATBEAR_MINT, wallet.keypair.publicKey);
        
        const tokenTx = new Transaction();
        
        // Create ATA if needed
        try {
          await getAccount(connection, targetATA);
        } catch {
          tokenTx.add(
            createAssociatedTokenAccountInstruction(
              sourceWallet.publicKey,
              targetATA,
              wallet.keypair.publicKey,
              FATBEAR_MINT
            )
          );
        }
        
        // Add transfer with realistic amount (not perfectly round)
        const variance = Math.floor(Math.random() * 100000) - 50000; // ±50k variance
        const actualAmount = wallet.amount + variance;
        
        tokenTx.add(
          createTransferInstruction(
            sourceATA,
            targetATA,
            sourceWallet.publicKey,
            actualAmount * 1_000_000, // 6 decimals
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        const sig = await sendAndConfirmTransaction(connection, tokenTx, [sourceWallet]);
        console.log(`   ✅ Success! Sent ${actualAmount.toLocaleString()} tokens`);
        console.log(`   TX: ${sig}`);
        
        // Update saved amount
        wallets[i].actualAmount = actualAmount;
        
      } catch (error) {
        console.error(`   ❌ Failed: ${error.message}`);
      }
    }
    
    // Save final phase data with actual amounts
    savePhaseData(phase, wallets, phaseNum);
    
    console.log('\n✅ Phase complete!');
    console.log('\n📝 Next steps:');
    phase.postActions.forEach((action, i) => console.log(`   ${i + 1}. ${action}`));
    
    if (phaseNum < 3) {
      console.log(`\n⏰ Next phase (Phase ${phaseNum + 1}) optimal time: ${PHASES[`phase${phaseNum + 1}`].optimalTime}`);
    }
  }
  
  // Main execution
  async function main() {
    console.log('🐋 FATBEAR Phased Distribution System');
    console.log('=' . repeat(60));
    
    const args = process.argv.slice(2);
    const phaseArg = args.find(arg => arg.startsWith('--phase='));
    
    if (!phaseArg) {
      console.log('\nUsage: node phasedSplit.js --phase=1 [--dry-run]');
      console.log('\nPhases:');
      console.log('  Phase 1: Initial Distribution (Tonight 2-4 AM EST)');
      console.log('  Phase 2: Community Growth (Weekend morning)');
      console.log('  Phase 3: Retail Wave (Next week)\n');
      console.log('Example: node phasedSplit.js --phase=1 --dry-run');
      return;
    }
    
    const phaseNum = parseInt(phaseArg.split('=')[1]);
    if (phaseNum < 1 || phaseNum > 3) {
      console.error('❌ Invalid phase number. Use 1, 2, or 3');
      return;
    }
    
    await executePhase(phaseNum);
  }
  
  main().catch(console.error);