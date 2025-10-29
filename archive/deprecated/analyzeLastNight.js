// analyzeLastNight.js - Comprehensive HootBot Log Analysis
const fs = require('fs');
const path = require('path');

// Configuration
const LOGS_DIR = path.join(__dirname, 'logs');
const SESSION_ANALYZER_PATH = './src/sessionAnalyzer.js';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Main analysis function
async function analyzeLogs() {
  console.log(`${colors.bright}${colors.cyan}🔍 HootBot Log Analysis Tool${colors.reset}`);
  console.log('=' .repeat(60) + '\n');

  // Step 1: Find all log files
  console.log(`${colors.yellow}📁 Scanning logs directory...${colors.reset}`);
  
  if (!fs.existsSync(LOGS_DIR)) {
    console.error(`${colors.red}❌ Logs directory not found at: ${LOGS_DIR}${colors.reset}`);
    console.log(`Creating logs directory...`);
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    return;
  }

  const files = fs.readdirSync(LOGS_DIR);
  console.log(`Found ${files.length} files in logs directory\n`);

  // Categorize files
  const logFiles = {
    sessions: files.filter(f => f.includes('session') && f.endsWith('.json')),
    trades: files.filter(f => f.includes('trades') && f.endsWith('.csv')),
    summaries: files.filter(f => f.includes('summary')),
    other: files.filter(f => !f.includes('session') && !f.includes('trades') && !f.includes('summary'))
  };

  // Display found files
  console.log(`${colors.blue}📊 Log File Summary:${colors.reset}`);
  console.log(`  Session files: ${logFiles.sessions.length}`);
  console.log(`  Trade CSVs: ${logFiles.trades.length}`);
  console.log(`  Summary files: ${logFiles.summaries.length}`);
  console.log(`  Other files: ${logFiles.other.length}\n`);

  // Step 2: Analyze session files
  if (logFiles.sessions.length > 0) {
    console.log(`${colors.green}📈 Analyzing Session Data...${colors.reset}`);
    
    // Get most recent session
    const recentSession = logFiles.sessions
      .map(f => ({
        name: f,
        path: path.join(LOGS_DIR, f),
        stats: fs.statSync(path.join(LOGS_DIR, f))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime)[0];

    console.log(`\nMost recent session: ${recentSession.name}`);
    console.log(`Last modified: ${recentSession.stats.mtime.toLocaleString()}`);

    try {
      const sessionData = JSON.parse(fs.readFileSync(recentSession.path, 'utf8'));
      analyzeSessionData(sessionData);
    } catch (error) {
      console.error(`Error reading session file: ${error.message}`);
    }
  }

  // Step 3: Analyze trade CSVs
  if (logFiles.trades.length > 0) {
    console.log(`\n${colors.green}💰 Analyzing Trade History...${colors.reset}`);
    
    const recentTrades = logFiles.trades
      .map(f => ({
        name: f,
        path: path.join(LOGS_DIR, f),
        stats: fs.statSync(path.join(LOGS_DIR, f))
      }))
      .sort((a, b) => b.stats.mtime - a.stats.mtime)[0];

    try {
      const csvContent = fs.readFileSync(recentTrades.path, 'utf8');
      // Parse CSV manually
      const lines = csvContent.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');
      const trades = lines.slice(1).map(line => {
        const values = line.split(',');
        const trade = {};
        headers.forEach((header, index) => {
          trade[header.trim()] = values[index]?.trim();
        });
        return trade;
      });
      analyzeTradeData(trades);
    } catch (error) {
      console.error(`Error reading trades CSV: ${error.message}`);
    }
  }

  // Step 4: Check sessionAnalyzer integration
  console.log(`\n${colors.yellow}🔧 Checking SessionAnalyzer Integration...${colors.reset}`);
  checkSessionAnalyzer();

  // Step 5: Generate recommendations
  console.log(`\n${colors.cyan}💡 Recommendations for AI Learning:${colors.reset}`);
  generateAIRecommendations(logFiles);
}

// Analyze session data
function analyzeSessionData(session) {
  console.log('\n📊 Session Analysis:');
  console.log('─'.repeat(40));
  
  // Calculate key metrics
  const duration = session.endTime ? 
    (new Date(session.endTime) - new Date(session.startTime)) / 1000 / 60 : 
    'Ongoing';
  
  console.log(`Duration: ${duration} minutes`);
  console.log(`Total trades: ${session.trades?.length || 0}`);
  console.log(`Tokens analyzed: ${session.tokensAnalyzed || 'N/A'}`);
  
  if (session.trades && session.trades.length > 0) {
    const buys = session.trades.filter(t => t.type === 'BUY');
    const sells = session.trades.filter(t => t.type === 'SELL');
    
    console.log(`\nTrade Breakdown:`);
    console.log(`  Buys: ${buys.length}`);
    console.log(`  Sells: ${sells.length}`);
    
    // Calculate success rate
    const profitableTrades = session.trades.filter(t => t.result === 'profit');
    const successRate = (profitableTrades.length / session.trades.length * 100).toFixed(1);
    console.log(`  Success rate: ${successRate}%`);
    
    // MIND score analysis
    const avgMindScore = session.trades.reduce((sum, t) => sum + (t.mindScore || 0), 0) / session.trades.length;
    console.log(`  Avg MIND score: ${avgMindScore.toFixed(1)}%`);
  }
  
  // Panic events
  if (session.emergencyExits) {
    console.log(`\n⚠️ Emergency exits: ${session.emergencyExits}`);
  }
}

// Analyze trade data
function analyzeTradeData(trades) {
  console.log('\n💰 Trade Performance:');
  console.log('─'.repeat(40));
  
  const totalTrades = trades.length;
  const buyTrades = trades.filter(t => t.type === 'BUY');
  const sellTrades = trades.filter(t => t.type === 'SELL');
  
  console.log(`Total trades: ${totalTrades}`);
  console.log(`Buy orders: ${buyTrades.length}`);
  console.log(`Sell orders: ${sellTrades.length}`);
  
  // Calculate P&L
  const totalSpent = buyTrades.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const totalEarned = sellTrades.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const netPL = totalEarned - totalSpent;
  
  console.log(`\nFinancial Summary:`);
  console.log(`  Total spent: ${totalSpent.toFixed(4)} SOL`);
  console.log(`  Total earned: ${totalEarned.toFixed(4)} SOL`);
  console.log(`  Net P&L: ${netPL > 0 ? '+' : ''}${netPL.toFixed(4)} SOL`);
  
  // Token performance
  const tokenPerformance = {};
  trades.forEach(trade => {
    const token = trade.token || 'UNKNOWN';
    if (!tokenPerformance[token]) {
      tokenPerformance[token] = { buys: 0, sells: 0, volume: 0 };
    }
    
    if (trade.type === 'BUY') {
      tokenPerformance[token].buys++;
    } else {
      tokenPerformance[token].sells++;
    }
    tokenPerformance[token].volume += parseFloat(trade.amount || 0);
  });
  
  console.log(`\nTop traded tokens:`);
  Object.entries(tokenPerformance)
    .sort((a, b) => b[1].volume - a[1].volume)
    .slice(0, 5)
    .forEach(([token, stats]) => {
      console.log(`  ${token}: ${stats.buys} buys, ${stats.sells} sells, ${stats.volume.toFixed(3)} SOL`);
    });
}

// Check sessionAnalyzer integration
function checkSessionAnalyzer() {
  if (fs.existsSync(SESSION_ANALYZER_PATH)) {
    console.log(`✅ SessionAnalyzer found at: ${SESSION_ANALYZER_PATH}`);
    
    // Try to load it
    try {
      const { getSessionAnalyzer } = require(SESSION_ANALYZER_PATH);
      const analyzer = getSessionAnalyzer();
      
      console.log('✅ SessionAnalyzer loaded successfully');
      console.log('   Available methods:', Object.keys(analyzer).join(', '));
      
      // Check if it's properly logging
      const recentLogs = fs.readdirSync(LOGS_DIR)
        .filter(f => f.includes('session') && f.endsWith('.json'))
        .map(f => fs.statSync(path.join(LOGS_DIR, f)).mtime);
      
      const lastLog = recentLogs.length > 0 ? new Date(Math.max(...recentLogs)) : null;
      
      if (lastLog) {
        const hoursSinceLastLog = (Date.now() - lastLog) / 1000 / 60 / 60;
        if (hoursSinceLastLog < 24) {
          console.log(`✅ Recent logs found (${hoursSinceLastLog.toFixed(1)} hours ago)`);
        } else {
          console.log(`⚠️ No recent logs (last: ${hoursSinceLastLog.toFixed(1)} hours ago)`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error loading SessionAnalyzer: ${error.message}`);
    }
  } else {
    console.error(`❌ SessionAnalyzer not found at: ${SESSION_ANALYZER_PATH}`);
  }
}

// Generate AI recommendations
function generateAIRecommendations(logFiles) {
  const recommendations = [];
  
  // Check data completeness
  if (logFiles.sessions.length === 0) {
    recommendations.push('📝 No session logs found - ensure sessionAnalyzer is properly integrated');
  }
  
  if (logFiles.trades.length === 0) {
    recommendations.push('📝 No trade CSVs found - verify CSV export is working');
  }
  
  // Check data freshness
  const allFiles = [...logFiles.sessions, ...logFiles.trades, ...logFiles.summaries];
  if (allFiles.length > 0) {
    const mostRecent = allFiles
      .map(f => fs.statSync(path.join(LOGS_DIR, f)).mtime)
      .sort((a, b) => b - a)[0];
    
    const hoursSinceLastLog = (Date.now() - mostRecent) / 1000 / 60 / 60;
    if (hoursSinceLastLog > 6) {
      recommendations.push(`⏰ Logs are ${hoursSinceLastLog.toFixed(1)} hours old - check if bot is running`);
    }
  }
  
  // AI stack recommendations
  console.log('\n🤖 AI Learning Stack Setup:');
  console.log('─'.repeat(40));
  console.log('1. Data Collection: ' + (logFiles.sessions.length > 0 ? '✅ Active' : '❌ Need setup'));
  console.log('2. Feature Engineering: Use MIND scores, panic levels, market dynamics');
  console.log('3. Model Options:');
  console.log('   - Reinforcement Learning: For real-time decision optimization');
  console.log('   - LSTM/GRU: For time-series prediction of token performance');
  console.log('   - Random Forest: For feature importance and risk assessment');
  console.log('4. Training Pipeline:');
  console.log('   - Batch training on historical data');
  console.log('   - Online learning from live trades');
  console.log('   - A/B testing with different strategies');
  
  if (recommendations.length > 0) {
    console.log('\n⚠️ Action Items:');
    recommendations.forEach(rec => console.log(`  ${rec}`));
  }
}

// Export analysis function
async function exportAnalysisReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(LOGS_DIR, `analysis-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    logsAnalyzed: fs.readdirSync(LOGS_DIR).length,
    recommendations: [],
    metrics: {}
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Analysis report saved to: ${reportPath}`);
}

// Run analysis
if (require.main === module) {
  analyzeLogs()
    .then(() => exportAnalysisReport())
    .catch(error => {
      console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
      process.exit(1);
    });
}

module.exports = { analyzeLogs, analyzeSessionData, analyzeTradeData };