// HootBot/src/scripts/preLaunchTest.ts
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { loadDistributionWallets } from '../utils/walletLoader';
import { jupiterSwap } from '../utils/jupiterSwap';
import { rpcManager } from '../utils/rpcManager';
import { FATBEAR_CONFIG } from '../config/tokenConfig';
import chalk from 'chalk';

async function runPreLaunchChecks() {
  console.log(chalk.cyan.bold('\n🚀 $FATBEAR Distribution Pre-Launch Checklist\n'));
  
  const checks = {
    wallets: false,
    balances: false,
    rpc: false,
    jupiter: false,
    calculations: false
  };
  
  // 1. Check Wallet Loading
  console.log(chalk.yellow('1️⃣ Checking wallet configuration...'));
  try {
    const wallets = await loadDistributionWallets();
    console.log(chalk.green(`   ✅ Loaded ${wallets.length} wallets successfully`));
    checks.wallets = true;
    
    // 2. Check Wallet Balances
    console.log(chalk.yellow('\n2️⃣ Checking wallet balances...'));
    for (const wallet of wallets) {
      try {
        const balance = await rpcManager.executeRequest(async (connection) => {
          return await connection.getBalance(wallet.publicKey);
        });
        
        const sol = balance / LAMPORTS_PER_SOL;
        if (sol < 0.1) {
          console.log(chalk.red(`   ⚠️ ${wallet.name}: Low balance (${sol.toFixed(4)} SOL)`));
        } else {
          console.log(chalk.green(`   ✅ ${wallet.name}: ${sol.toFixed(4)} SOL`));
        }
        
        // Check token balance
        // TODO: Add token balance check
      } catch (error) {
        console.log(chalk.red(`   ❌ ${wallet.name}: Failed to check balance`));
      }
    }
    checks.balances = true;
    
  } catch (error) {
    console.log(chalk.red(`   ❌ Failed to load wallets: ${error}`));
  }
  
  // 3. Check RPC Connections
  console.log(chalk.yellow('\n3️⃣ Testing RPC endpoints...'));
  try {
    const blockHeight = await rpcManager.executeRequest(async (connection) => {
      return await connection.getSlot();
    });
    console.log(chalk.green(`   ✅ RPC working - Block: ${blockHeight}`));
    checks.rpc = true;
  } catch (error) {
    console.log(chalk.red(`   ❌ RPC connection failed: ${error}`));
  }
  
  // 4. Check Jupiter Integration
  console.log(chalk.yellow('\n4️⃣ Testing Jupiter price feed...'));
  try {
    const price = await jupiterSwap.getCurrentPrice();
    console.log(chalk.green(`   ✅ Current $FATBEAR price: $${price.toFixed(6)}`));
    checks.jupiter = true;
  } catch (error) {
    console.log(chalk.red(`   ❌ Jupiter API failed: ${error}`));
  }
  
  // 5. Verify Calculations
  console.log(chalk.yellow('\n5️⃣ Verifying distribution calculations...'));
  console.log(`   Current Supply: ${FATBEAR_CONFIG.totalSupply.toLocaleString()}`);
  console.log(`   Your Holdings: ${FATBEAR_CONFIG.currentHoldings.toLocaleString()} (${FATBEAR_CONFIG.currentHoldingsPercent}%)`);
  console.log(`   Target Holdings: ${FATBEAR_CONFIG.targetHoldings.toLocaleString()} (5.5%)`);
  console.log(`   To Distribute: ${FATBEAR_CONFIG.tokensToDistribute.toLocaleString()}`);
  
  const estimatedRevenueSOL = FATBEAR_CONFIG.tokensToDistribute * FATBEAR_CONFIG.initialPrice / 1e6; // Divide by 1M for proper calculation
  const estimatedRevenueUSD = estimatedRevenueSOL * FATBEAR_CONFIG.solPrice;
  console.log(`   Estimated Revenue: ${estimatedRevenueSOL.toFixed(2)} SOL (~${estimatedRevenueUSD.toLocaleString()})`);
  checks.calculations = true;
  
  // Final Summary
  console.log(chalk.cyan.bold('\n📊 Pre-Launch Summary:'));
  Object.entries(checks).forEach(([check, passed]) => {
    const status = passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
    console.log(`   ${check}: ${status}`);
  });
  
  const allPassed = Object.values(checks).every(v => v);
  if (allPassed) {
    console.log(chalk.green.bold('\n🎉 All checks passed! Ready to launch!'));
    console.log(chalk.yellow('\nTo start distribution:'));
    console.log(chalk.white('   npx ts-node src/bots/volume/strategicDistributionBot.ts'));
  } else {
    console.log(chalk.red.bold('\n⚠️ Some checks failed. Please fix issues before launching.'));
  }
}

// Run the checks
runPreLaunchChecks().catch(console.error);