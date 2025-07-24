// tokenHunter.ts
import { scanAllSources } from './dist/pumpTools/tokenScanner.js';
import { runMindEngine } from './dist/mindEngine.js';
import { initiateCoordinatedBuy } from './dist/pumpTools/tradeExecutor.js';
import { Connection } from '@solana/web3.js';
import dotenv from 'dotenv';

dotenv.config();

// Configuration
const config = {
  scanInterval: 5 * 60 * 1000,  // 5 minutes
  maxTokensToAnalyze: 3,        // Analyze top 3
  minMindScore: 75,             // Minimum survivability
  testAmount: 0.01,             // SOL per test trade
  autoBuy: false                // Set true for full auto
};

async function huntTokens() {
  console.log('🎯 HootBot Token Hunter v1.0');
  console.log('================================\n');
  
  const connection = new Connection(
    process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com'
  );
  
  // Save original token
  const originalToken = process.env.DUTCHBROS_TOKEN_MINT;
  
  while (true) {
    try {
      console.log(`⏰ [${new Date().toISOString()}] Scanning for opportunities...\n`);
      
      // Scan all sources
      const tokens = await scanAllSources(connection);
      
      if (tokens.length === 0) {
        console.log('No tokens found. Retrying...\n');
        await sleep(config.scanInterval);
        continue;
      }
      
      // Display found tokens
      console.log(`Found ${tokens.length} tokens:\n`);
      tokens.slice(0, 5).forEach((token, i) => {
        console.log(`${i + 1}. ${token.symbol} (${token.source})`);
        console.log(`   Score: ${token.score}/100`);
        console.log(`   Volume: $${token.volume?.toLocaleString() || 'Unknown'}`);
        console.log(`   Mint: ${token.mint}\n`);
      });
      
      // Analyze top tokens with MIND
      for (let i = 0; i < Math.min(config.maxTokensToAnalyze, tokens.length); i++) {
        const token = tokens[i];
        console.log(`\n🧠 Analyzing ${token.symbol} with MIND...`);
        
        // Temporarily switch to this token
        process.env.DUTCHBROS_TOKEN_MINT = token.mint;
        
        try {
          const mindResult = await runMindEngine();
          
          console.log(`\n📊 MIND Results for ${token.symbol}:`);
          console.log(`   Survivability: ${mindResult.survivability}%`);
          console.log(`   Action: ${mindResult.action}`);
          console.log(`   Dev Exhaustion: ${mindResult.devExhaustion}%`);
          
          // Check if we should buy
          if (mindResult.action === 'BUY' && mindResult.survivability >= config.minMindScore) {
            console.log(`\n✅ ${token.symbol} APPROVED by MIND!`);
            
            if (config.autoBuy) {
              console.log(`🎯 Auto-buying ${config.testAmount} SOL...`);
              await initiateCoordinatedBuy(config.testAmount);
              console.log('✅ Purchase complete!\n');
              
              // Optional: Add to tracking list
              saveToWatchlist(token);
            } else {
              console.log('💡 Auto-buy disabled. Enable in config to execute.\n');
            }
          } else {
            console.log(`❌ ${token.symbol} did not meet criteria.\n`);
          }
          
        } catch (error) {
          console.error(`Error analyzing ${token.symbol}:`, error);
        }
      }
      
    } catch (error) {
      console.error('Hunt cycle error:', error);
    } finally {
      // Restore original token
      process.env.DUTCHBROS_TOKEN_MINT = originalToken;
    }
    
    console.log(`\n⏳ Next scan in ${config.scanInterval / 60000} minutes...\n`);
    console.log('─'.repeat(50) + '\n');
    
    await sleep(config.scanInterval);
  }
}

// Simple tracking
function saveToWatchlist(token: any) {
  // In production, save to database or file
  console.log(`📝 Added ${token.symbol} to watchlist`);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Manual mode - scan once and exit
async function scanOnce() {
  const connection = new Connection(process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com');
  const tokens = await scanAllSources(connection);
  
  console.log('\n🏆 TOP OPPORTUNITIES:\n');
  tokens.slice(0, 10).forEach((token, i) => {
    console.log(`${i + 1}. ${token.symbol} - Score: ${token.score}/100`);
    console.log(`   Source: ${token.source}`);
    console.log(`   Mint: ${token.mint}`);
    console.log('');
  });
}

// Run based on command line args
if (require.main === module) {
  const mode = process.argv[2];
  
  if (mode === '--once') {
    scanOnce().catch(console.error);
  } else {
    huntTokens().catch(console.error);
  }
}