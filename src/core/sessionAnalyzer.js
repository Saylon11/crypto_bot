// src/sessionAnalyzer.js - Session tracking and analysis for HootBot

const fs = require('fs');
const path = require('path');

class SessionAnalyzer {
  constructor() {
    this.sessionId = `session_${Date.now()}`;
    this.startTime = Date.now();
    this.logDir = path.join(__dirname, '../logs');
    this.logFile = path.join(this.logDir, `${this.sessionId}.json`);
    
    // Session metrics
    this.metrics = {
      sessionId: this.sessionId,
      startTime: new Date().toISOString(),
      endTime: null,
      runtime: 0,
      cyclesCompleted: 0,
      tokensAnalyzed: new Set(),
      tokenDetails: [],
      trades: [],
      mindAnalyses: [],
      actionCounts: {
        BUY: 0,
        SELL: 0,
        HOLD: 0,
        PAUSE: 0,
        EXIT: 0
      },
      profitMetrics: {
        totalSpent: 0,
        totalEarned: 0,
        netProfit: 0,
        winningTrades: 0,
        losingTrades: 0,
        successRate: 0
      },
      marketConditions: {
        averageSurvivability: 0,
        averagePanicScore: 0,
        averageFlowStrength: 0,
        bullishCycles: 0,
        bearishCycles: 0
      }
    };
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log(`📁 Created log directory: ${this.logDir}`);
    }
    
    // Write initial session file
    this.saveSession();
  }
  
  // Log a MIND analysis result
  logMindAnalysis(tokenMint, mindResult) {
    const analysis = {
      timestamp: Date.now(),
      tokenMint,
      survivabilityScore: mindResult.survivabilityScore,
      action: mindResult.tradeSuggestion?.action || 'UNKNOWN',
      suggestedPercentage: mindResult.tradeSuggestion?.percentage || 0,
      reason: mindResult.tradeSuggestion?.reason || '',
      panicScore: mindResult.panicScore || 0,
      marketFlowStrength: mindResult.marketFlowStrength || 0,
      riskLevel: mindResult.riskLevel || 'unknown',
      whaleActivity: mindResult.whaleActivity || false,
      consumerProfile: mindResult.consumerProfile
    };
    
    this.metrics.mindAnalyses.push(analysis);
    this.metrics.tokensAnalyzed.add(tokenMint);
    
    // Update action counts
    if (analysis.action in this.metrics.actionCounts) {
      this.metrics.actionCounts[analysis.action]++;
    }
    
    // Update market conditions
    this.updateMarketConditions(mindResult);
    
    this.saveSession();
    return analysis;
  }
  
  // Log a trade execution
  logTrade(trade) {
    const tradeRecord = {
      timestamp: Date.now(),
      tokenMint: trade.tokenMint,
      tokenSymbol: trade.tokenSymbol || 'UNKNOWN',
      type: trade.type, // 'BUY' or 'SELL'
      amount: trade.amount,
      price: trade.price || 0,
      mindScore: trade.mindScore || 0,
      txSignature: trade.txSignature || 'TEST_MODE',
      success: trade.success !== false
    };
    
    this.metrics.trades.push(tradeRecord);
    
    // Update profit metrics
    if (trade.type === 'BUY') {
      this.metrics.profitMetrics.totalSpent += trade.amount;
    } else if (trade.type === 'SELL') {
      this.metrics.profitMetrics.totalEarned += trade.amount;
    }
    
    this.saveSession();
    return tradeRecord;
  }
  
  // Log a complete cycle
  logCycle(cycleData) {
    this.metrics.cyclesCompleted++;
    
    if (cycleData.tokenDetails) {
      this.metrics.tokenDetails.push({
        timestamp: Date.now(),
        ...cycleData.tokenDetails
      });
    }
    
    this.saveSession();
  }
  
  // Log MIND analysis (NEW METHOD)
  logAnalysis(mindResult) {
    const analysis = {
      timestamp: Date.now(),
      survivabilityScore: mindResult.survivabilityScore,
      action: mindResult.tradeSuggestion?.action || 'UNKNOWN',
      suggestedPercentage: mindResult.tradeSuggestion?.percentage || 0,
      reason: mindResult.tradeSuggestion?.reason || '',
      panicScore: mindResult.panicScore || 0,
      marketFlowStrength: mindResult.marketFlowStrength || 0,
      riskLevel: mindResult.riskLevel || 'unknown',
      whaleActivity: mindResult.whaleActivity || false,
      confidenceScore: mindResult.confidenceScore || 0,
      consumerProfile: mindResult.consumerProfile
    };
    
    this.metrics.mindAnalyses.push(analysis);
    
    // Update action counts
    if (analysis.action in this.metrics.actionCounts) {
      this.metrics.actionCounts[analysis.action]++;
    }
    
    this.saveSession();
    return analysis;
  }
  
  // Update market condition averages
  updateMarketConditions(mindResult) {
    const analyses = this.metrics.mindAnalyses;
    const total = analyses.length;
    
    if (total > 0) {
      // Calculate averages
      this.metrics.marketConditions.averageSurvivability = 
        analyses.reduce((sum, a) => sum + a.survivabilityScore, 0) / total;
        
      this.metrics.marketConditions.averagePanicScore = 
        analyses.reduce((sum, a) => sum + a.panicScore, 0) / total;
        
      this.metrics.marketConditions.averageFlowStrength = 
        analyses.reduce((sum, a) => sum + a.marketFlowStrength, 0) / total;
      
      // Count bullish/bearish cycles
      if (mindResult.tradeSuggestion?.action === 'BUY') {
        this.metrics.marketConditions.bullishCycles++;
      } else if (mindResult.tradeSuggestion?.action === 'SELL') {
        this.metrics.marketConditions.bearishCycles++;
      }
    }
  }
  
  // Calculate session statistics
  calculateStats() {
    const runtime = (Date.now() - this.startTime) / 1000 / 60; // minutes
    const trades = this.metrics.trades;
    const buyTrades = trades.filter(t => t.type === 'BUY');
    const sellTrades = trades.filter(t => t.type === 'SELL');
    
    // Calculate profit metrics
    this.metrics.profitMetrics.netProfit = 
      this.metrics.profitMetrics.totalEarned - this.metrics.profitMetrics.totalSpent;
    
    // Calculate success rate (simplified - you'd need to track buy/sell pairs)
    if (trades.length > 0) {
      this.metrics.profitMetrics.successRate = 
        (this.metrics.profitMetrics.winningTrades / trades.length) * 100;
    }
    
    return {
      sessionId: this.sessionId,
      runtime: runtime.toFixed(1),
      cyclesCompleted: this.metrics.cyclesCompleted,
      uniqueTokens: this.metrics.tokensAnalyzed.size,
      totalAnalyses: this.metrics.mindAnalyses.length,
      tradesExecuted: trades.length,
      buyOrders: buyTrades.length,
      sellOrders: sellTrades.length,
      netProfit: this.metrics.profitMetrics.netProfit.toFixed(4),
      actionBreakdown: this.metrics.actionCounts,
      marketConditions: this.metrics.marketConditions
    };
  }
  
  // Save session to file
  saveSession() {
    try {
      const data = {
        ...this.metrics,
        runtime: ((Date.now() - this.startTime) / 1000 / 60).toFixed(1),
        uniqueTokensCount: this.metrics.tokensAnalyzed.size,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.logFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving session:', error.message);
    }
  }
  
  // End session and generate final report
  endSession() {
    this.metrics.endTime = new Date().toISOString();
    const stats = this.calculateStats();
    
    console.log('\n📊 === SESSION SUMMARY ===');
    console.log(`sessionId: ${stats.sessionId}`);
    console.log(`runtime: ${stats.runtime} minutes`);
    console.log(`cyclesCompleted: ${stats.cyclesCompleted}`);
    console.log(`uniqueTokens: ${stats.uniqueTokens}`);
    console.log(`totalAnalyses: ${stats.totalAnalyses}`);
    console.log(`tradesExecuted: ${stats.tradesExecuted}`);
    console.log(`netProfit: ${stats.netProfit} SOL`);
    console.log('actionBreakdown:');
    Object.entries(stats.actionBreakdown).forEach(([action, count]) => {
      console.log(`  ${action}: ${count}`);
    });
    
    console.log('\n📈 Market Conditions:');
    console.log(`  Avg Survivability: ${stats.marketConditions.averageSurvivability.toFixed(1)}%`);
    console.log(`  Avg Panic Score: ${stats.marketConditions.averagePanicScore.toFixed(1)}%`);
    console.log(`  Avg Flow Strength: ${stats.marketConditions.averageFlowStrength.toFixed(1)}%`);
    console.log(`  Bullish Cycles: ${stats.marketConditions.bullishCycles}`);
    console.log(`  Bearish Cycles: ${stats.marketConditions.bearishCycles}`);
    
    // Save final session
    this.saveSession();
    
    // Also save a summary file
    const summaryFile = path.join(this.logDir, 'session-summaries.json');
    let summaries = [];
    
    if (fs.existsSync(summaryFile)) {
      summaries = JSON.parse(fs.readFileSync(summaryFile, 'utf8'));
    }
    
    summaries.push(stats);
    fs.writeFileSync(summaryFile, JSON.stringify(summaries, null, 2));
    
    return stats;
  }
  
  // Generate detailed report (NEW METHOD)
  generateReport() {
    const stats = this.calculateStats();
    
    console.log('\n💡 Key Insights:');
    
    // Find most common action
    const mostCommonAction = Object.entries(this.metrics.actionCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonAction) {
      console.log(`🔴 Most frequent signal: ${mostCommonAction[0]} (${mostCommonAction[1]} times)`);
    }
    
    // Average scores
    if (this.metrics.mindAnalyses.length > 0) {
      const avgSurvivability = this.metrics.marketConditions.averageSurvivability;
      const avgPanic = this.metrics.marketConditions.averagePanicScore;
      
      if (avgSurvivability < 50) {
        console.log('⚠️ Low average survivability - consider adjusting thresholds');
      }
      if (avgPanic > 50) {
        console.log('⚠️ High average panic - market may be too volatile');
      }
    }
    
    return stats;
  }
  
  // Export session data to CSV (NEW METHOD)
  exportToCSV() {
    const csvFile = path.join(this.logDir, `trades_${this.sessionId}.csv`);
    const trades = this.metrics.trades;
    
    if (trades.length === 0) {
      console.log('No trades to export');
      return;
    }
    
    const headers = ['timestamp', 'type', 'token', 'amount', 'price', 'mindScore', 'result'];
    const rows = trades.map(t => [
      new Date(t.timestamp).toISOString(),
      t.type,
      t.token,
      t.amount,
      t.price || 0,
      t.mindScore || 0,
      t.result || 'pending'
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    
    try {
      fs.writeFileSync(csvFile, csv);
      console.log(`📄 Trades exported to: ${csvFile}`);
    } catch (error) {
      console.error('Error exporting CSV:', error.message);
    }
  }
}

// Create singleton instance
let sessionAnalyzer = null;

function getSessionAnalyzer() {
  if (!sessionAnalyzer) {
    sessionAnalyzer = new SessionAnalyzer();
  }
  return sessionAnalyzer;
}

module.exports = {
  SessionAnalyzer,
  getSessionAnalyzer
};