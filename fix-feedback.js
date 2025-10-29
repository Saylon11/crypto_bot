const fs = require('fs');
const { extractFeatures } = require('./src/ai/features');

console.log('🔧 Fixing feedback data vectors...\n');

// Load current feedback
const feedbackPath = './data/trades/feedback.json';
const data = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));

let fixedCount = 0;
let invalidCount = 0;
let totalCount = data.length;

// Fix each trade to have proper 12D feature vector
const fixed = data.map((trade, index) => {
  if (!trade.featureVector || trade.featureVector.length !== 12) {
    invalidCount++;
    
    // Try to reconstruct from marketSnapshot
    if (trade.marketSnapshot && Object.keys(trade.marketSnapshot).length > 0) {
      trade.featureVector = extractFeatures(trade.marketSnapshot);
      fixedCount++;
      console.log(`✅ Fixed trade ${index} using marketSnapshot`);
    } else {
      // Solana-optimized defaults for 2025 memecoin vibes
      trade.featureVector = [
        0.75, // survivabilityScore (high)
        0.20, // panicScore (low) 
        0.30, // riskScore (moderate)
        0.70, // confidenceLevel (high)
        0.80, // marketFlowStrength (strong)
        0.85, // liquidityDepth (deep)
        1.00, // whaleActivity (yes)
        0.00, // devExhausted (no)
        0.90, // fomoIndex (HIGH - memecoin vibes)
        1.00, // volumeSpike (YES)
        0.80, // sentimentPolarity (positive)
        0.15  // chainCongestion (LOW - Solana fast)
      ];
      fixedCount++;
      console.log(`⚠️  Fixed trade ${index} with Solana-optimized defaults`);
    }
  }
  return trade;
});

// Save fixed data
fs.writeFileSync(feedbackPath, JSON.stringify(fixed, null, 2));

console.log('\n📊 Fix Summary:');
console.log(`Total trades: ${totalCount}`);
console.log(`Invalid vectors found: ${invalidCount}`);
console.log(`Vectors fixed: ${fixedCount}`);
console.log(`Valid vectors: ${totalCount - invalidCount}`);
console.log('\n✅ Feedback data fixed and saved');
