// src/utils/moduleLoader.js
// Helper to safely load modules with fallbacks

/**
 * Safely require a module with a fallback function
 */
function safeRequire(modulePath, fallbackExports) {
    try {
      return require(modulePath);
    } catch (error) {
      console.warn(`⚠️ Module ${modulePath} not found, using fallback`);
      return fallbackExports;
    }
  }
  
  // Fallback implementations for missing modules
  
  const fallbackHerdSentiment = {
    analyzeHerdSentiment: (walletData) => {
      const buys = walletData.filter(w => w.type === 'buy').length;
      const sells = walletData.filter(w => w.type === 'sell').length;
      const total = walletData.length || 1;
      
      return {
        netSentiment: ((buys - sells) / total) * 100,
        buyPressure: (buys / total) * 100,
        sellPressure: (sells / total) * 100,
        dominantEmotion: buys > sells ? 'greed' : 'fear',
        volumeTrend: 'stable'
      };
    }
  };
  
  const fallbackWalletProfiler = {
    profileWallets: (walletData) => {
      const walletBalances = {};
      walletData.forEach(w => {
        if (!walletBalances[w.walletAddress]) {
          walletBalances[w.walletAddress] = 0;
        }
        walletBalances[w.walletAddress] += w.amount;
      });
      
      const wallets = Object.entries(walletBalances).map(([address, balance]) => ({
        address,
        balance
      })).sort((a, b) => b.balance - a.balance);
      
      const whales = wallets.filter(w => w.balance > 10000).map(w => w.address);
      const dolphins = wallets.filter(w => w.balance > 1000 && w.balance <= 10000).map(w => w.address);
      const shrimps = wallets.filter(w => w.balance <= 1000).map(w => w.address);
      
      return {
        whales,
        dolphins,
        shrimps,
        totalWallets: wallets.length,
        distribution: {
          whalePercentage: (whales.length / wallets.length) * 100,
          dolphinPercentage: (dolphins.length / wallets.length) * 100,
          shrimpPercentage: (shrimps.length / wallets.length) * 100
        }
      };
    }
  };
  
  const fallbackDevWalletTracker = {
    trackDevWallets: (devWallets) => ({
      riskScore: 10,
      flaggedWallets: [],
      suspiciousActivity: false,
      devRiskLevel: 10
    })
  };
  
  const fallbackConsumerProfile = {
    analyzeConsumerProfiles: (walletData) => {
      const profile = fallbackWalletProfiler.profileWallets(walletData);
      return {
        shrimpPercent: profile.distribution.shrimpPercentage,
        dolphinPercent: profile.distribution.dolphinPercentage,
        whalePercent: profile.distribution.whalePercentage
      };
    }
  };
  
  const fallbackMarketFlow = {
    analyzeMarketFlow: (timestamps) => {
      const recentTimestamps = timestamps.filter(t => 
        Date.now() - t < 24 * 60 * 60 * 1000
      );
      
      return {
        inflowStrength: 50 + Math.random() * 30,
        netFlow: recentTimestamps.length,
        volumeTrend: recentTimestamps.length > timestamps.length / 2 ? 'increasing' : 'stable'
      };
    }
  };
  
  const fallbackLiquidityCycles = {
    mapLiquidityCycles: (timestamps) => {
      const hourlyActivity = {};
      timestamps.forEach(t => {
        const hour = new Date(t).getUTCHours();
        hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
      });
      
      const peakHours = Object.entries(hourlyActivity)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([hour]) => parseInt(hour));
      
      return {
        hourlyActivity,
        peakHours
      };
    }
  };
  
  const fallbackRegionalLiquidity = {
    mapRegionalLiquidity: (timestamps) => ({
      regionActivity: {
        'US': 40,
        'EU': 30,
        'ASIA': 20,
        'OTHER': 10
      }
    })
  };
  
  const fallbackPanicSelling = {
    detectPanicSelling: (walletData) => {
      const recentSells = walletData.filter(w => 
        w.type === 'sell' && (Date.now() - w.timestamp) < 60 * 60 * 1000
      );
      
      const panicScore = Math.min((recentSells.length / walletData.length) * 200, 100);
      
      return {
        panicScore,
        recentSellVolume: recentSells.reduce((sum, w) => sum + w.amount, 0),
        panicWallets: recentSells.map(w => w.walletAddress).slice(0, 5),
        comment: panicScore > 50 ? 'High panic activity detected' : 'Normal trading activity'
      };
    }
  };
  
  const fallbackDevExhaustion = {
    detectDevExhaustion: (walletData, devWallets) => {
      const exhausted = Math.random() > 0.7;
      const remainingPercentage = exhausted ? 10 : 70 + Math.random() * 30;
      
      return {
        exhausted,
        remainingPercentage,
        devWallets: devWallets || []
      };
    }
  };
  
  module.exports = {
    safeRequire,
    fallbacks: {
      herdSentiment: fallbackHerdSentiment,
      walletProfiler: fallbackWalletProfiler,
      devWalletTracker: fallbackDevWalletTracker,
      consumerProfile: fallbackConsumerProfile,
      marketFlow: fallbackMarketFlow,
      liquidityCycles: fallbackLiquidityCycles,
      regionalLiquidity: fallbackRegionalLiquidity,
      panicSelling: fallbackPanicSelling,
      devExhaustion: fallbackDevExhaustion
    }
  };