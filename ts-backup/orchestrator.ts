// HootBot/src/orchestrator.ts
import { Connection } from '@solana/web3.js';
import { MindCore } from './mind/mindCore';
import { HootBotExecutor } from './executor/hootBotExecutor';
import { WalletManager } from './executor/walletManager';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Main orchestrator - Connects M.I.N.D. (brain) with HootBot (body)
 * Scans for gems and trades based on emotional liquidity analysis
 */
export class MindHootBotOrchestrator {
  private mind: MindCore;
  private executor: HootBotExecutor;
  private connection: Connection;
  private walletManager: WalletManager;
  private isRunning: boolean = false;
  private cycleInterval: number = 60000; // 1 minute default
  private cycleCount: number = 0;
  private tradesExecuted: number = 0;
  private gemsFound: Set<string> = new Set();
  
  constructor() {
    // Initialize connection
    const rpcUrl = process.env.HELIUS_RPC_URL || 
                  (process.env.HELIUS_API_KEY 
                    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
                    : process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com');
    
    this.connection = new Connection(rpcUrl, 'confirmed');
    
    // Initialize components
    this.mind = new MindCore();
    this.walletManager = new WalletManager(this.connection);
    this.executor = new HootBotExecutor(this.connection, this.walletManager);
  }
  
  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing M.I.N.D. Gem Scanner + HootBot...');
    console.log('   "Simplicity is the ultimate sophistication"');
    console.log('');
    
    // Initialize wallet manager
    await this.walletManager.initialize();
    
    // Display system status
    const walletStats = this.walletManager.getStats();
    console.log('\n📊 System Status:');
    console.log(`   Mode: GEM SCANNER (Emotional Liquidity Analysis)`);
    console.log(`   Wallets: ${walletStats.totalWallets} loaded (${walletStats.walletsWithBalance} funded)`);
    console.log(`   Total Balance: ${walletStats.totalBalance.toFixed(4)} SOL`);
    console.log(`   RPC: ${process.env.HELIUS_API_KEY ? 'Helius' : 'Public'}`);
    console.log(`   MIND Analysis: Enabled`);
    console.log(`   Scan Interval: ${parseInt(process.env.MIND_SCAN_INTERVAL_MS || '60000') / 1000}s`);
    
    // Display scan parameters
    console.log('\n🔍 Scan Parameters:');
    console.log(`   Market Cap: $10k - $10M`);
    console.log(`   Min Volume: $1k`);
    console.log(`   Min Holders: 50`);
    console.log(`   Max Age: 7 days`);
    console.log(`   Targets: Pump.fun + Graduated tokens`);
    console.log('');
  }
  
  /**
   * Start the autonomous gem scanning loop
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ System already running');
      return;
    }
    
    this.isRunning = true;
    console.log('🧠 M.I.N.D. activated - Scanning for gems with high emotional liquidity\n');
    
    // Main loop
    while (this.isRunning) {
      try {
        await this.runCycle();
        
        // Dynamic interval based on market conditions
        const nextInterval = this.calculateNextInterval();
        console.log(`\n⏰ Next scan in ${(nextInterval / 1000).toFixed(0)} seconds...\n`);
        
        await this.sleep(nextInterval);
      } catch (error) {
        console.error('❌ Cycle error:', error);
        await this.sleep(30000); // 30 second recovery
      }
    }
  }
  
  /**
   * Run a single scan/execution cycle
   */
  private async runCycle(): Promise<void> {
    this.cycleCount++;
    const cycleStart = Date.now();
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`🔄 Scan Cycle #${this.cycleCount} - ${new Date().toLocaleTimeString()}`);
    console.log(`${'═'.repeat(60)}\n`);
    
    // Step 1: M.I.N.D. scans for opportunities
    console.log('🧠 M.I.N.D. scanning Solana ecosystem for gems...');
    const directive = await this.mind.scanForOpportunities();
    
    // Step 2: Log directive details
    this.logDirective(directive);
    
    // Step 3: Track if we found a new gem
    if (directive.action === 'BUY' && directive.tokenAddress) {
      if (!this.gemsFound.has(directive.tokenAddress)) {
        this.gemsFound.add(directive.tokenAddress);
        console.log(`\n💎 NEW GEM DISCOVERED! Total unique gems: ${this.gemsFound.size}`);
      }
    }
    
    // Step 4: HootBot executes directive
    if (directive.action !== 'WAIT') {
      await this.executor.execute(directive);
      if (directive.action === 'BUY') {
        this.tradesExecuted++;
      }
    }
    
    // Step 5: Display execution stats
    const execStats = this.executor.getStats();
    const cycleTime = Date.now() - cycleStart;
    
    console.log(`\n📈 Session Stats:`);
    console.log(`   Scan Duration: ${(cycleTime / 1000).toFixed(1)}s`);
    console.log(`   Unique Gems Found: ${this.gemsFound.size}`);
    console.log(`   Trades Executed: ${this.tradesExecuted}`);
    console.log(`   Queue: ${execStats.queueLength} pending`);
    console.log(`   Active Wallets: ${execStats.walletsInCooldown}`);
  }
  
  /**
   * Calculate next cycle interval
   */
  private calculateNextInterval(): number {
    const currentDirective = this.mind.getCurrentDirective();
    
    if (!currentDirective) {
      return parseInt(process.env.MIND_SCAN_INTERVAL_MS || '60000');
    }
    
    // Adjust based on market conditions
    switch (currentDirective.priority) {
      case 'HIGH':
        return 30000; // 30 seconds for high priority gems
      case 'MEDIUM':
        return 60000; // 1 minute for medium
      case 'LOW':
      default:
        return 120000; // 2 minutes for low priority
    }
  }
  
  /**
   * Log directive details
   */
  private logDirective(directive: any): void {
    const { action, confidence, executionProfile, metadata, tokenSymbol } = directive;
    
    console.log(`\n📋 M.I.N.D. Directive:`);
    console.log(`   Action: ${action}`);
    
    if (action === 'BUY' && tokenSymbol) {
      console.log(`   Token: $${tokenSymbol} (${directive.tokenAddress.slice(0, 8)}...)`);
      console.log(`   Amount: ${directive.amount?.toFixed(4)} SOL`);
    }
    
    console.log(`   Confidence: ${confidence}%`);
    console.log(`   Profile: ${executionProfile.personality} (${executionProfile.urgency})`);
    
    if (metadata && action !== 'WAIT') {
      console.log(`\n📊 Token Metrics:`);
      if (metadata.survivabilityScore !== undefined) {
        console.log(`   Survivability: ${metadata.survivabilityScore}%`);
      }
      if (metadata.marketCap !== undefined) {
        console.log(`   Market Cap: $${(metadata.marketCap / 1000).toFixed(1)}k`);
      }
      if (metadata.volume24h !== undefined) {
        console.log(`   24h Volume: $${(metadata.volume24h / 1000).toFixed(1)}k`);
      }
      if (metadata.isGraduated !== undefined) {
        console.log(`   Status: ${metadata.isGraduated ? 'Graduated to Raydium' : 'On Pump.fun'}`);
      }
      if (metadata.panicScore !== undefined) {
        console.log(`   Panic Level: ${metadata.panicScore}%`);
      }
      if (metadata.whaleActivity !== undefined) {
        console.log(`   Whale Activity: ${metadata.whaleActivity ? '🐋 DETECTED' : 'None'}`);
      }
    }
  }
  
  /**
   * Stop the system gracefully
   */
  async stop(): Promise<void> {
    console.log('\n👋 Shutting down M.I.N.D. Gem Scanner...');
    this.isRunning = false;
    
    // Save wallet state
    await this.walletManager.saveState();
    
    // Display final stats
    const stats = this.executor.getStats();
    console.log('\n📊 Final Statistics:');
    console.log(`   Total Scan Cycles: ${this.cycleCount}`);
    console.log(`   Unique Gems Found: ${this.gemsFound.size}`);
    console.log(`   Trades Executed: ${this.tradesExecuted}`);
    console.log(`   Success Rate: ${stats.metrics.totalExecutionsCompleted}/${stats.metrics.totalExecutionsStarted}`);
    
    if (this.gemsFound.size > 0) {
      console.log('\n💎 Gems Discovered:');
      let i = 1;
      for (const gem of this.gemsFound) {
        console.log(`   ${i}. ${gem.slice(0, 8)}...${gem.slice(-4)}`);
        i++;
        if (i > 10) {
          console.log(`   ... and ${this.gemsFound.size - 10} more`);
          break;
        }
      }
    }
    
    console.log('\n✅ System stopped gracefully');
  }
  
  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Main entry point
 */
async function main() {
  console.clear();
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║              🦉 HootBot M.I.N.D. Gem Scanner 🧠              ║
║                                                              ║
║          "Simplicity is the ultimate sophistication"         ║
║                                                              ║
║      Scanning for gems with high emotional liquidity...      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`);

  // Create orchestrator
  const orchestrator = new MindHootBotOrchestrator();
  
  // Store for graceful shutdown
  global.orchestratorInstance = orchestrator;
  
  try {
    // Initialize
    await orchestrator.initialize();
    
    // Warning
    console.log('\n⚠️  LIVE GEM SCANNING MODE - Real trades will be executed!');
    console.log('The system will scan for and trade tokens based on emotional liquidity.');
    console.log('Press Ctrl+C to stop at any time.\n');
    
    // Start autonomous operation
    await orchestrator.start();
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (global.orchestratorInstance) {
    await global.orchestratorInstance.stop();
  }
  process.exit(0);
});

// Export for testing
export { main };
export default MindHootBotOrchestrator;

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

// TypeScript global declaration
declare global {
  var orchestratorInstance: MindHootBotOrchestrator | undefined;
}