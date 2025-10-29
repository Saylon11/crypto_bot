// HootBot/src/pumpTools/raidHootBot.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import dotenv from 'dotenv';
import bs58 from 'bs58';
import * as fs from 'fs';
import { executeBuy } from './tradeExecutor';
import { logRaid } from '../../utils/logger';

dotenv.config();

const RAID_MULTIPLIER = 0.05; // Base raid amount in SOL
const RAID_COUNT = 10; // Number of raid buys
const DELAY_BETWEEN_RAIDS = 3000; // 3 seconds between buys

// Get wallet function that properly loads from keypair path
function getWallet(): Keypair {
  // First try to load from keypair path
  const keypairPath = process.env.HOOTBOT_KEYPAIR_PATH;
  if (keypairPath) {
    try {
      console.log(`Loading wallet from: ${keypairPath}`);
      const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      const wallet = Keypair.fromSecretKey(new Uint8Array(keypairData));
      console.log(`Wallet loaded: ${wallet.publicKey.toString()}`);
      return wallet;
    } catch (error) {
      console.error('Error loading keypair file:', error);
    }
  }
  
  // Fallback to WALLET_SECRET_KEY
  const secretKey = process.env.WALLET_SECRET_KEY;
  if (!secretKey) {
    throw new Error('No wallet configured! Set HOOTBOT_KEYPAIR_PATH or WALLET_SECRET_KEY');
  }
  
  console.log('Using WALLET_SECRET_KEY');
  return Keypair.fromSecretKey(bs58.decode(secretKey));
}

// Get connection with fallback to public RPC
function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  
  if (heliusKey && heliusKey !== 'your_key' && heliusKey !== '') {
    console.log('Using Helius RPC...');
    return new Connection(
      `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`,
      'confirmed'
    );
  } else {
    console.log('⚠️  No Helius API key found, using public RPC (may be rate limited)...');
    return new Connection(
      'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }
}

export async function executeRaidSequence(skipMind: boolean = true): Promise<void> {
  console.log('\n🚨 RAID SEQUENCE INITIATED 🚨');
  console.log(`MIND Analysis: ${skipMind ? 'BYPASSED' : 'ENABLED'}`);
  
  const tokenMint = process.env.TARGET_TOKEN_MINT || process.env.TEST_TOKEN_ADDRESS;
  if (!tokenMint) {
    throw new Error('No token mint configured for raids!');
  }

  const connection = getConnection();

  // Get wallet using the proper function
  const wallet = getWallet();
  console.log(`Wallet address: ${wallet.publicKey.toString()}`);

  // Check balance
  let balance: number;
  try {
    balance = await connection.getBalance(wallet.publicKey);
    console.log(`Wallet balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    throw error;
  }
  
  const totalRaidCost = RAID_MULTIPLIER * RAID_COUNT * LAMPORTS_PER_SOL;
  
  if (balance < totalRaidCost) {
    console.log(`❌ Insufficient balance for raid sequence`);
    console.log(`Required: ${totalRaidCost / LAMPORTS_PER_SOL} SOL`);
    console.log(`Available: ${balance / LAMPORTS_PER_SOL} SOL`);
    return;
  }

  console.log(`\n💰 Raid Configuration:`);
  console.log(`- Token: ${tokenMint}`);
  console.log(`- Total raids: ${RAID_COUNT}`);
  console.log(`- Amount per raid: ${RAID_MULTIPLIER} SOL`);
  console.log(`- Total volume: ${RAID_MULTIPLIER * RAID_COUNT} SOL`);

  let successfulRaids = 0;
  let failedRaids = 0;

  // Create a simple logger if the utils/logger doesn't exist
  const logRaidSimple = async (data: any) => {
    console.log('Raid log:', data);
  };

  for (let i = 0; i < RAID_COUNT; i++) {
    try {
      console.log(`\n🎯 Executing raid ${i + 1}/${RAID_COUNT}...`);
      
      // Execute buy with MIND bypass
      const result = await executeBuy(
        tokenMint,
        RAID_MULTIPLIER,
        wallet,
        connection,
        skipMind // This will bypass MIND analysis
      );

      if (result.success) {
        successfulRaids++;
        console.log(`✅ Raid ${i + 1} successful!`);
        console.log(`   Amount: ${RAID_MULTIPLIER} SOL`);
        console.log(`   Tokens received: ${result.tokensReceived?.toFixed(2) || 'Unknown'}`);
        
        try {
          await logRaid({
            raidNumber: i + 1,
            amount: RAID_MULTIPLIER,
            success: true,
            txSignature: result.signature,
            tokensReceived: result.tokensReceived
          });
        } catch (e) {
          // Fallback if logger doesn't exist
          await logRaidSimple({
            raidNumber: i + 1,
            amount: RAID_MULTIPLIER,
            success: true,
            txSignature: result.signature,
            tokensReceived: result.tokensReceived
          });
        }
      } else {
        failedRaids++;
        console.log(`❌ Raid ${i + 1} failed: ${result.error}`);
        
        try {
          await logRaid({
            raidNumber: i + 1,
            amount: RAID_MULTIPLIER,
            success: false,
            error: result.error
          });
        } catch (e) {
          // Fallback if logger doesn't exist
          await logRaidSimple({
            raidNumber: i + 1,
            amount: RAID_MULTIPLIER,
            success: false,
            error: result.error
          });
        }
      }

      // Delay between raids (except for last one)
      if (i < RAID_COUNT - 1) {
        console.log(`⏳ Waiting ${DELAY_BETWEEN_RAIDS / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RAIDS));
      }

    } catch (error) {
      failedRaids++;
      console.error(`❌ Raid ${i + 1} error:`, error);
      
      try {
        await logRaid({
          raidNumber: i + 1,
          amount: RAID_MULTIPLIER,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      } catch (e) {
        // Fallback if logger doesn't exist
        await logRaidSimple({
          raidNumber: i + 1,
          amount: RAID_MULTIPLIER,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
  }

  // Final summary
  console.log('\n📊 RAID SEQUENCE COMPLETE');
  console.log(`✅ Successful raids: ${successfulRaids}/${RAID_COUNT}`);
  console.log(`❌ Failed raids: ${failedRaids}/${RAID_COUNT}`);
  console.log(`💰 Total volume generated: ${successfulRaids * RAID_MULTIPLIER} SOL`);
}

// Direct execution
if (require.main === module) {
  executeRaidSequence(true) // Always skip MIND for direct raids
    .then(() => {
      console.log('\n🦉 Raid sequence completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Raid sequence error:', error);
      process.exit(1);
    });
}