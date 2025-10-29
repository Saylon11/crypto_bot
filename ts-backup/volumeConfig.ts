// HootBot/src/bots/config/volumeConfig.ts
// Configuration for the volume generation bot

export const VOLUME_CONFIG = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 💰 TRADE AMOUNTS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  amounts: {
    min: 0.001,           // Minimum trade size (SOL)
    max: 0.01,            // Maximum trade size (SOL)
    variance: 0.15,       // 15% variance on all trades
    whaleProbability: 0.05, // 5% chance for 2x size trade
    whaleMultiplier: 2,   // Whale trades are 2x normal size
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ⏰ TIMING CONFIGURATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  timing: {
    minDelayMinutes: 3,   // Minimum time between trades
    maxDelayMinutes: 15,  // Maximum time between trades
    avgDelayMinutes: 8,   // Average delay (for exponential distribution)
    
    // FOMO patterns
    consecutiveBuyChance: 0.15,  // 15% chance for quick follow-up
    fomoDelaySeconds: {
      min: 30,
      max: 90,
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📈 MARKET PATTERNS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  patterns: {
    // Peak trading hours (UTC)
    peakHours: [
      14, 15, 16,  // 9-11 AM EST
      20, 21, 22,  // 3-5 PM EST
    ],
    peakMultiplier: 1.5,     // 50% more activity during peak
    weekendMultiplier: 0.7,  // 30% less activity on weekends
    
    // Market response patterns
    priceDropResponse: {
      enabled: true,
      threshold: -5,         // Respond to 5% drops
      buyMultiplier: 3,      // Buy 3x normal amount
    },
    
    priceSurgeResponse: {
      enabled: true,
      threshold: 10,         // Respond to 10% surges
      buyMultiplier: 2,      // Buy 2x to ride momentum
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🎯 TARGETS & LIMITS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  targets: {
    dailyVolume: 1.0,        // Target 1 SOL daily volume
    maxDailyVolume: 2.0,     // Never exceed 2 SOL daily
    minWalletBalance: 0.1,   // Keep 0.1 SOL for fees
    
    // Per-session limits
    maxConsecutiveFails: 3,  // Pause after 3 failures
    pauseDurationMinutes: 30, // Pause duration
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔧 TECHNICAL SETTINGS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  technical: {
    slippage: 0.01,          // 1% slippage tolerance
    priorityFee: 0.00001,    // Priority fee in SOL
    confirmationLevel: 'confirmed' as const,
    
    // Multi-wallet settings (future)
    useMultiWallet: false,
    walletRotation: {
      enabled: false,
      walletCount: 5,
      rotationPattern: 'random', // 'random' | 'sequential'
    },
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 📊 REPORTING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  reporting: {
    logLevel: 'info',        // 'debug' | 'info' | 'warn' | 'error'
    logToFile: true,
    logFilePath: './logs/volume-bot.log',
    
    // Metrics tracking
    trackMetrics: true,
    metricsInterval: 3600000, // Log metrics every hour
    
    // Discord/Telegram notifications (future)
    notifications: {
      enabled: false,
      dailySummary: true,
      errorAlerts: true,
    },
  },
};

// Helper function to get current config based on market conditions
export function getDynamicConfig() {
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  
  let multiplier = 1;
  
  // Apply peak hour boost
  if (VOLUME_CONFIG.patterns.peakHours.includes(hour)) {
    multiplier *= VOLUME_CONFIG.patterns.peakMultiplier;
  }
  
  // Apply weekend reduction
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    multiplier *= VOLUME_CONFIG.patterns.weekendMultiplier;
  }
  
  return {
    ...VOLUME_CONFIG,
    currentMultiplier: multiplier,
    isPeakHour: VOLUME_CONFIG.patterns.peakHours.includes(hour),
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

// Validation function
export function validateConfig(): boolean {
  const errors: string[] = [];
  
  if (VOLUME_CONFIG.amounts.min >= VOLUME_CONFIG.amounts.max) {
    errors.push('Min amount must be less than max amount');
  }
  
  if (VOLUME_CONFIG.timing.minDelayMinutes >= VOLUME_CONFIG.timing.maxDelayMinutes) {
    errors.push('Min delay must be less than max delay');
  }
  
  if (VOLUME_CONFIG.targets.dailyVolume > VOLUME_CONFIG.targets.maxDailyVolume) {
    errors.push('Daily target cannot exceed max daily volume');
  }
  
  if (errors.length > 0) {
    console.error('❌ Config validation failed:');
    errors.forEach(e => console.error(`   - ${e}`));
    return false;
  }
  
  return true;
}