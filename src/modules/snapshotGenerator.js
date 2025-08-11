// src/modules/snapshotGenerator.js

/**
 * Generate a visual snapshot of the token's emotional liquidity state
 * @param {Object} input - Snapshot input data
 */
function generateSnapshot(input) {
    // Validate and provide defaults for all numeric values
    const safeInput = {
      token: input.token || "UNKNOWN",
      timestamp: input.timestamp || Date.now(),
      whales: input.whales || 0,
      dolphins: input.dolphins || 0,
      shrimps: input.shrimps || 0,
      survivability: input.survivability || 0,
      panicScore: input.panicScore || 0,
      devExhaustion: input.devExhaustion || 0,
      marketFlow: input.marketFlow || 0,
      region: input.region || "Unknown",
      peakHour: input.peakHour || "N/A",
      action: input.action || "HOLD"
    };
  
    console.log(`\n❤️ Emotional Liquidity Snapshot: ${safeInput.token}\n`);
  
    console.log(`🐋 Whales: ${safeInput.whales}   🐬 Dolphins: ${safeInput.dolphins}   🦐 Shrimps: ${safeInput.shrimps}`);
    console.log(`🌱 Survivability Score: ${safeInput.survivability}%`);
    console.log(`😱 Panic Score: ${safeInput.panicScore}%   → ${panicLabel(safeInput.panicScore)}`);
    console.log(`😅 Dev Exhaustion: ${safeInput.devExhaustion}% of dev tokens sold`);
    
    // Safe toFixed call with validation
    const flowValue = typeof safeInput.marketFlow === 'number' && !isNaN(safeInput.marketFlow) 
      ? safeInput.marketFlow.toFixed(2) 
      : '0.00';
    const flowSign = safeInput.marketFlow > 0 ? "+" : "";
    
    console.log(`💸 Flow: Net Inflow ${flowSign}${flowValue}%`);
    console.log(`🕒 Peak Hour: ${safeInput.peakHour}`);
    console.log(`🌍 Region: ${regionFlag(safeInput.region)} ${safeInput.region}`);
    console.log(`🚀 Suggested Action: ${safeInput.action}\n`);
  }
  
  function panicLabel(score) {
    // Ensure score is a valid number
    const safeScore = typeof score === 'number' ? score : 0;
    
    if (safeScore >= 70) return "⚠️ High panic exits";
    if (safeScore >= 40) return "Moderate exit behavior";
    return "Low panic activity";
  }
  
  function regionFlag(code) {
    const flags = {
      US: "🇺🇸",
      JP: "🇯🇵",
      DE: "🇩🇪",
      BR: "🇧🇷",
      IN: "🇮🇳",
      KR: "🇰🇷",
      GB: "🇬🇧",
      CA: "🇨🇦",
      CN: "🇨🇳",
      SG: "🇸🇬",
      RU: "🇷🇺",
      TR: "🇹🇷",
      VN: "🇻🇳",
      NG: "🇳🇬",
      FR: "🇫🇷",
      TH: "🇹🇭",
      ID: "🇮🇩",
      ES: "🇪🇸",
      AU: "🇦🇺"
    };
    
    const upperCode = code ? code.toUpperCase() : '';
    return flags[upperCode] || "🌍";
  }
  
  module.exports = {
    generateSnapshot
  };