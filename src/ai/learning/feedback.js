// /Users/owner/Desktop/HootBot/src/ai/learning/feedback.js
// Capture outcomes with M.I.N.D. features - Foundation for learning

const fs = require('fs');
const path = require('path');

// Use JSON store for offline persistence (can swap to SQLite later)
const STORE_PATH = path.join(__dirname, '../../../data/trades/feedback.json');

// In-memory buffer for performance
const memoryBuffer = [];
const BUFFER_SIZE = 100;
const PERSIST_INTERVAL = 30000; // Persist every 30 seconds

// Ensure directory exists
function ensureDirectoryExists() {
  const dir = path.dirname(STORE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Load existing data on startup
function loadExistingData() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('⚠️ Could not load existing feedback data:', error.message);
  }
  return [];
}

// Persist memory buffer to disk
function persistToStore() {
  if (memoryBuffer.length === 0) return;
  
  try {
    ensureDirectoryExists();
    
    // Load existing data
    const existingData = loadExistingData();
    
    // Append new data
    const allData = [...existingData, ...memoryBuffer];
    
    // Keep only recent data (last 10,000 trades)
    const recentData = allData.slice(-10000);
    
    // Write to disk
    fs.writeFileSync(STORE_PATH, JSON.stringify(recentData, null, 2));
    
    console.log(`💾 Persisted ${memoryBuffer.length} trades to disk`);
    
    // Clear buffer
    memoryBuffer.length = 0;
    
  } catch (error) {
    console.error('❌ Failed to persist feedback data:', error.message);
  }
}

// Extract features from market snapshot
function extractFeatures(marketSnapshot) {
  // Map M.I.N.D. analysis to normalized features (0-1 range)
  if (!marketSnapshot) {
    return Array(10).fill(0.5); // Default features
  }
  
  return [
    (marketSnapshot.survivabilityScore || 50) / 100,
    (marketSnapshot.panicScore || 0) / 100,
    (marketSnapshot.confidenceLevel || 50) / 100,
    (marketSnapshot.riskScore || 50) / 100,
    (marketSnapshot.marketFlowStrength || 50) / 100,
    (marketSnapshot.liquidityDepth || 50) / 100,
    marketSnapshot.whaleActivity ? 1 : 0,
    marketSnapshot.devExhausted ? 1 : 0,
    marketSnapshot.volumeTrend === 'increasing' ? 1 : marketSnapshot.volumeTrend === 'decreasing' ? 0 : 0.5,
    marketSnapshot.dominantEmotion === 'greed' ? 1 : marketSnapshot.dominantEmotion === 'fear' ? 0 : 0.5
  ];
}

// Main feedback recording function
function recordTradeResult({ directive, result, marketSnapshot }) {
  try {
    const outcome = {
      // Core data
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      
      // Features for ML
      featureVector: extractFeatures(marketSnapshot),
  featureVector: validateAndFixVector(extractFeatures(marketSnapshot)),  featureVector: validateAndFixVector(extractFeatures(marketSnapshot)),      
      // Decision data
      decision: directive.action,
      executionProfile: directive.executionProfile || 'UNKNOWN',
      tokenMint: directive.tokenMint,
      
      // Outcome data
      success: result.success,
      profitLoss: result.profitLoss || 0,
      profitable: result.profitLoss > 0.05 ? 1 : 0,
      
      // Performance data
      latencyMs: result.latencyMs || 0,
      
      // Metadata
      metadata: {
        mindScore: directive.reasoning?.mindScore || 0,
        riskScore: directive.reasoning?.riskScore || 0,
        confidenceLevel: directive.reasoning?.confidenceLevel || 0,
        reason: directive.reasoning?.primaryReason || 'Unknown'
      }
    };
    
    // Add to memory buffer
    memoryBuffer.push(outcome);
    
    // Log for monitoring
    console.log(`📊 Trade recorded: ${directive.tokenMint?.slice(0, 8)}... - Action: ${outcome.decision} - P/L: ${(outcome.profitLoss * 100).toFixed(2)}%`);
    
    // Persist if buffer is full
    if (memoryBuffer.length >= BUFFER_SIZE) {
      persistToStore();
    }
    
    return outcome;
    
  } catch (error) {
    console.error('❌ Failed to record trade result:', error.message);
    // Don't throw - we don't want feedback failures to break trading
  }
}

// Get recent trades for analysis
function getRecentTrades(limit = 1000) {
  const allData = [...loadExistingData(), ...memoryBuffer];
  return allData.slice(-limit);
}

// Get performance stats
function getPerformanceStats() {
  const trades = getRecentTrades();
  
  if (trades.length === 0) {
    return { totalTrades: 0, winRate: 0, avgProfit: 0 };
  }
  
  const wins = trades.filter(t => t.profitable === 1).length;
  const totalProfitLoss = trades.reduce((sum, t) => sum + t.profitLoss, 0);
  
  return {
    totalTrades: trades.length,
    winRate: (wins / trades.length) * 100,
    avgProfit: (totalProfitLoss / trades.length) * 100,
    avgLatency: trades.reduce((sum, t) => sum + (t.latencyMs || 0), 0) / trades.length
  };
}

// Set up periodic persistence
setInterval(persistToStore, PERSIST_INTERVAL);

// Persist on process exit
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down - persisting feedback data...');
  persistToStore();
  process.exit(0);
});

// Export public interface
module.exports = {
  recordTradeResult,
  getRecentTrades,
  getPerformanceStats,
  extractFeatures
};

// Vector validation function
function validateAndFixVector(featureVector) {
  if (!Array.isArray(featureVector)) {
    console.warn('⚠️ Invalid feature vector type - creating default');
    return Array(12).fill(0.5);
  }
  
  if (featureVector.length !== 12) {
    console.warn(`⚠️ Invalid vector length: ${featureVector.length} - fixing`);
    
    if (featureVector.length < 12) {
      // Pad with defaults
      while (featureVector.length < 12) {
        featureVector.push(0.5);
      }
    } else {
      // Truncate
      featureVector = featureVector.slice(0, 12);
    }
  }
  
  // Ensure all values are numbers between 0 and 1
  return featureVector.map(v => {
    const num = Number(v);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  });
}

// Export for use
module.exports.validateAndFixVector = validateAndFixVector;

// Vector validation function
function validateAndFixVector(featureVector) {
  if (!Array.isArray(featureVector)) {
    console.warn('⚠️ Invalid feature vector type - creating default');
    return Array(12).fill(0.5);
  }
  
  if (featureVector.length !== 12) {
    console.warn(`⚠️ Invalid vector length: ${featureVector.length} - fixing`);
    
    if (featureVector.length < 12) {
      // Pad with defaults
      while (featureVector.length < 12) {
        featureVector.push(0.5);
      }
    } else {
      // Truncate
      featureVector = featureVector.slice(0, 12);
    }
  }
  
  // Ensure all values are numbers between 0 and 1
  return featureVector.map(v => {
    const num = Number(v);
    if (isNaN(num)) return 0.5;
    return Math.max(0, Math.min(1, num));
  });
}

// Export for use
module.exports.validateAndFixVector = validateAndFixVector;
