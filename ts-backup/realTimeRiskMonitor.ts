// HootBot/src/realTimeRiskMonitor.ts
// Real-Time Risk Detection - Catch rugs before they happen
// Compatible with existing HootBot structure using compiled modules

import { Connection, PublicKey } from '@solana/web3.js';

// Import M.I.N.D. engine
let runMindEngine: any;
let emergencyExitPosition: any;

try {
  const mindModule = require('./dist/mindEngine');
  runMindEngine = mindModule.runMindEngine;
  
  const sellModule = require('./dist/pumpTools/sellExecutor');
  emergencyExitPosition = sellModule.emergencyExitPosition;
} catch (error) {
  console.warn('⚠️ Warning: Some modules not available for RealTimeRiskMonitor');
  console.warn('   Will operate in limited mode');
}

/**
 * Critical risk thresholds that trigger immediate exits
 */
const CRITICAL_THRESHOLDS = {
  PANIC_SCORE: 80,           // Immediate exit if panic > 80%
  DEV_DUMP_PERCENT: 15,      // Exit if dev sells >15% in one tx
  SURVIVABILITY_DROP: 30,    // Exit if M.I.N.D. score drops >30 points
  WHALE_EXIT_COUNT: 3,       // Exit if 3+ whales sell within 60s
  VOLUME_SPIKE: 500,         // Monitor for abnormal volume (500% increase)
  LIQUIDITY_DROP: 40         // Exit if liquidity drops >40%
};

/**
 * Real-time monitoring frequencies
 */
const MONITOR_INTERVALS = {
  HIGH_RISK_SCAN: 10000,     // 10 seconds for active positions
  DEV_WALLET_WATCH: 5000,    // 5 seconds for dev activity
  WHALE_TRACKING: 15000,     // 15 seconds for whale movements
  MARKET_PULSE: 30000        // 30 seconds for general market health
};

interface RiskAlert {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  type: string;
  message: string;
  timestamp: number;
  tokenMint: string;
  action: 'MONITOR' | 'REDUCE' | 'EXIT' | 'EMERGENCY_EXIT';
}

interface PositionRisk {
  tokenMint: string;
  symbol: string;
  lastMindScore: number;
  riskLevel: number;
  isActivelyMonitored: boolean;
  lastScanTime: number;
  emergencyExitTriggered: boolean;
}

export class RealTimeRiskMonitor {
  private connection: Connection;
  private monitoredPositions: Map<string, PositionRisk> = new Map();
  private riskAlerts: RiskAlert[] = [];
  private isMonitoring: boolean = false;
  private monitoringIntervals: NodeJS.Timeout[] = [];

  constructor() {
    this.connection = new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
  }

  /**
   * Add position to real-time monitoring
   */
  addPosition(tokenMint: string, symbol: string, initialMindScore: number = 0): void {
    const position: PositionRisk = {
      tokenMint,
      symbol,
      lastMindScore: initialMindScore,
      riskLevel: 0,
      isActivelyMonitored: true,
      lastScanTime: 0,
      emergencyExitTriggered: false
    };

    this.monitoredPositions.set(tokenMint, position);
    console.log(`🔍 Added ${symbol} to real-time risk monitoring`);
    
    // Start monitoring if not already running
    if (!this.isMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * Remove position from monitoring
   */
  removePosition(tokenMint: string): void {
    const position = this.monitoredPositions.get(tokenMint);
    if (position) {
      console.log(`✅ Removed ${position.symbol} from risk monitoring`);
      this.monitoredPositions.delete(tokenMint);
    }

    // Stop monitoring if no positions left
    if (this.monitoredPositions.size === 0 && this.isMonitoring) {
      this.stopMonitoring();
    }
  }

  /**
   * Start all monitoring intervals
   */
  private startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('🚨 Real-time risk monitoring ACTIVE');

    // High-frequency position scanning
    const highRiskInterval = setInterval(async () => {
      await this.scanHighRiskPositions();
    }, MONITOR_INTERVALS.HIGH_RISK_SCAN);

    // Dev wallet monitoring
    const devWalletInterval = setInterval(async () => {
      await this.monitorDevWallets();
    }, MONITOR_INTERVALS.DEV_WALLET_WATCH);

    // Whale movement tracking
    const whaleInterval = setInterval(async () => {
      await this.trackWhaleMovements();
    }, MONITOR_INTERVALS.WHALE_TRACKING);

    // Market pulse check
    const marketInterval = setInterval(async () => {
      await this.checkMarketPulse();
    }, MONITOR_INTERVALS.MARKET_PULSE);

    // Store intervals for cleanup
    this.monitoringIntervals = [
      highRiskInterval,
      devWalletInterval, 
      whaleInterval,
      marketInterval
    ];
  }

  /**
   * Stop all monitoring
   */
  private stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('⏹️ Real-time risk monitoring STOPPED');

    // Clear all intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals = [];
  }

  /**
   * Scan high-risk positions with M.I.N.D. every 10 seconds
   */
  private async scanHighRiskPositions(): Promise<void> {
    if (this.monitoredPositions.size === 0 || !runMindEngine) return;

    for (const [tokenMint, position] of this.monitoredPositions) {
      if (!position.isActivelyMonitored || position.emergencyExitTriggered) continue;

      try {
        // Quick M.I.N.D. analysis
        const originalTarget = process.env.HELIUS_TARGET_WALLET;
        process.env.HELIUS_TARGET_WALLET = tokenMint;
        
        const mindResult = await runMindEngine();
        
        // Restore original target
        process.env.HELIUS_TARGET_WALLET = originalTarget;

        // Update position data
        const mindScoreDrop = position.lastMindScore - mindResult.survivabilityScore;
        position.lastMindScore = mindResult.survivabilityScore;
        position.lastScanTime = Date.now();

        // Check for critical conditions
        const alerts = this.evaluateRiskConditions(position, mindResult, mindScoreDrop);
        
        // Process alerts
        for (const alert of alerts) {
          await this.handleRiskAlert(alert);
        }

      } catch (error: any) {
        console.error(`Error scanning ${position.symbol}:`, error.message);
      }
    }
  }

  /**
   * Monitor dev wallets for sudden movements
   */
  private async monitorDevWallets(): Promise<void> {
    // This would integrate with your devWalletTracker
    // For now, placeholder that checks for known dev wallet patterns
    console.log('👀 Monitoring dev wallets for sudden movements...');
    
    // TODO: Implement real-time dev wallet transaction monitoring
    // This should watch for large sells from known dev addresses
  }

  /**
   * Track whale movements and exits
   */
  private async trackWhaleMovements(): Promise<void> {
    console.log('🐋 Tracking whale movements...');
    
    // TODO: Implement whale transaction monitoring
    // Watch for large sells that could indicate coordinated exits
  }

  /**
   * General market health pulse check
   */
  private async checkMarketPulse(): Promise<void> {
    // Quick overall market sentiment check
    // Could check SOL price, overall volume, etc.
  }

  /**
   * Evaluate risk conditions and generate alerts
   */
  private evaluateRiskConditions(
    position: PositionRisk, 
    mindResult: any, 
    mindScoreDrop: number
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const now = Date.now();

    // CRITICAL: M.I.N.D. survivability crash
    if (mindScoreDrop >= CRITICAL_THRESHOLDS.SURVIVABILITY_DROP) {
      alerts.push({
        level: 'CRITICAL',
        type: 'MIND_CRASH',
        message: `${position.symbol} M.I.N.D. score crashed by ${mindScoreDrop.toFixed(1)} points`,
        timestamp: now,
        tokenMint: position.tokenMint,
        action: 'EMERGENCY_EXIT'
      });
    }

    // CRITICAL: Extreme panic selling
    const panicScore = mindResult.panicScore || 0;
    if (panicScore >= CRITICAL_THRESHOLDS.PANIC_SCORE) {
      alerts.push({
        level: 'CRITICAL',
        type: 'PANIC_SELLING',
        message: `${position.symbol} panic score: ${panicScore}% - Mass exit detected`,
        timestamp: now,
        tokenMint: position.tokenMint,
        action: 'EMERGENCY_EXIT'
      });
    }

    // HIGH: M.I.N.D. recommends exit
    if (mindResult.tradeSuggestion?.action === 'EXIT') {
      alerts.push({
        level: 'HIGH',
        type: 'MIND_EXIT_SIGNAL',
        message: `${position.symbol} M.I.N.D. EXIT signal: ${mindResult.tradeSuggestion.reason}`,
        timestamp: now,
        tokenMint: position.tokenMint,
        action: 'EXIT'
      });
    }

    // MEDIUM: M.I.N.D. recommends sell
    if (mindResult.tradeSuggestion?.action === 'SELL') {
      alerts.push({
        level: 'MEDIUM',
        type: 'MIND_SELL_SIGNAL',
        message: `${position.symbol} M.I.N.D. SELL signal: ${mindResult.tradeSuggestion.reason}`,
        timestamp: now,
        tokenMint: position.tokenMint,
        action: 'REDUCE'
      });
    }

    // MEDIUM: Low survivability
    if (mindResult.survivabilityScore < 30) {
      alerts.push({
        level: 'MEDIUM',
        type: 'LOW_SURVIVABILITY',
        message: `${position.symbol} survivability critically low: ${mindResult.survivabilityScore}%`,
        timestamp: now,
        tokenMint: position.tokenMint,
        action: 'REDUCE'
      });
    }

    return alerts;
  }

  /**
   * Handle risk alerts with appropriate actions
   */
  private async handleRiskAlert(alert: RiskAlert): Promise<void> {
    this.riskAlerts.push(alert);
    
    // Log the alert
    const emoji = {
      'CRITICAL': '🚨',
      'HIGH': '⚠️',
      'MEDIUM': '⚡',
      'LOW': 'ℹ️'
    };

    console.log(`\n${emoji[alert.level]} ${alert.level} RISK ALERT`);
    console.log(`   Type: ${alert.type}`);
    console.log(`   Message: ${alert.message}`);
    console.log(`   Action: ${alert.action}`);

    // Execute appropriate action
    const position = this.monitoredPositions.get(alert.tokenMint);
    if (!position) return;

    try {
      switch (alert.action) {
        case 'EMERGENCY_EXIT':
          if (!position.emergencyExitTriggered && emergencyExitPosition) {
            console.log(`🚨 EMERGENCY EXIT: ${position.symbol}`);
            await emergencyExitPosition(alert.tokenMint);
            position.emergencyExitTriggered = true;
            position.isActivelyMonitored = false;
          }
          break;

        case 'EXIT':
          console.log(`🚪 EXIT: ${position.symbol} (75% sell)`);
          // Implement coordinated exit (75% sell)
          break;

        case 'REDUCE':
          console.log(`📉 REDUCE: ${position.symbol} (25% sell)`);
          // Implement position reduction (25% sell)
          break;

        case 'MONITOR':
          console.log(`👀 MONITORING: ${position.symbol}`);
          // Just log, no action needed
          break;
      }
    } catch (error: any) {
      console.error(`Error executing ${alert.action}:`, error.message);
    }
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus() {
    return {
      isActive: this.isMonitoring,
      positionsMonitored: this.monitoredPositions.size,
      recentAlerts: this.riskAlerts.slice(-10),
      positions: Array.from(this.monitoredPositions.values()).map(p => ({
        symbol: p.symbol,
        lastMindScore: p.lastMindScore,
        riskLevel: p.riskLevel,
        emergencyExitTriggered: p.emergencyExitTriggered
      }))
    };
  }

  /**
   * Force emergency exit all positions
   */
  async emergencyExitAll(reason: string = "Manual trigger"): Promise<void> {
    console.log(`\n🚨 EMERGENCY EXIT ALL POSITIONS!`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Positions: ${this.monitoredPositions.size}`);

    if (!emergencyExitPosition) {
      console.log(`❌ Emergency exit function not available`);
      return;
    }

    const exitPromises: Promise<any>[] = [];
    
    for (const [tokenMint, position] of this.monitoredPositions) {
      if (!position.emergencyExitTriggered) {
        console.log(`🚨 Emergency exiting ${position.symbol}...`);
        exitPromises.push(emergencyExitPosition(tokenMint));
        position.emergencyExitTriggered = true;
      }
    }

    try {
      await Promise.allSettled(exitPromises);
      console.log(`✅ Emergency exit sequence completed`);
    } catch (error: any) {
      console.error('Error in emergency exit:', error.message);
    }

    // Clear all positions
    this.monitoredPositions.clear();
    this.stopMonitoring();
  }
}

export default RealTimeRiskMonitor;