// HootBot/src/launch.ts
import { config } from 'dotenv';
import MindHootBotOrchestrator from './orchestrator';

// Load environment variables
config();

/**
 * Launch script for M.I.N.D. + HootBot
 */
async function launch() {
  // Validate required environment variables
  const required = ['PRIMARY_TOKEN_MINT', 'HOOTBOT_KEYPAIR_PATH'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(key => console.error(`   - ${key}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }
  
  // Display configuration
  console.log('🔧 Configuration:');
  console.log(`   Token: $${process.env.PRIMARY_TOKEN_SYMBOL || 'FATBEAR'} (${process.env.PRIMARY_TOKEN_MINT?.slice(0, 8)}...)`);
  console.log(`   Wallet: ${process.env.HOOTBOT_WALLET_ADDRESS?.slice(0, 8)}...`);
  console.log(`   RPC: ${process.env.HELIUS_API_KEY ? 'Helius' : 'Public'}`);
  console.log(`   Mode: ${process.env.ENABLE_PAPER_TRADING === 'true' ? 'PAPER' : 'LIVE'}`);
  console.log(`   MIND: ${process.env.ENABLE_MIND_ANALYSIS === 'true' ? 'Enabled' : 'Disabled'}`);
  
  // Trading parameters
  console.log('\n📊 Trading Parameters:');
  console.log(`   Min Trade: ${process.env.MIN_TRADE_SIZE_SOL || '0.05'} SOL`);
  console.log(`   Max Trade: ${process.env.MAX_TRADE_SIZE_SOL || '0.5'} SOL`);
  console.log(`   Daily Target: ${process.env.DAILY_VOLUME_TARGET_SOL || '400'} SOL`);
  console.log(`   Min Wallet Cooldown: ${process.env.MIN_WALLET_COOLDOWN_MINUTES || '30'} minutes`);
  console.log('');
  
  // Create and start orchestrator
  const orchestrator = new MindHootBotOrchestrator();
  
  // Store for graceful shutdown
  global.orchestratorInstance = orchestrator;
  
  await orchestrator.initialize();
  await orchestrator.start();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Shutdown signal received...');
  
  if (global.orchestratorInstance) {
    await global.orchestratorInstance.stop();
  }
  
  console.log('✨ HootBot stopped gracefully. Goodbye! 🦉');
  process.exit(0);
});

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled error:', error);
  process.exit(1);
});

// Run
launch().catch(error => {
  console.error('💥 Launch failed:', error);
  process.exit(1);
});

// TypeScript global declaration
declare global {
  var orchestratorInstance: MindHootBotOrchestrator | undefined;
}