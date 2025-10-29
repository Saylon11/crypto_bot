// HootBot/fix-mindcore.js
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/mind/mindCore.ts');

console.log('🔧 Fixing mindCore.ts...\n');

try {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find and replace the analyzeToken method
  const oldMethod = `  /**
   * Analyze a specific token for emotional liquidity
   */
  private async analyzeToken(token: UnifiedToken): Promise<MINDReport> {
    console.log(\`🧠 Analyzing \${token.symbol || token.mint.slice(0, 8)}...\`);
    console.log(\`   Source: \${token.source}\`);
    if (token.emotionalScore) {
      console.log(\`   Emotional Score: \${token.emotionalScore}/100\`);
    }
    
    // Run the MIND engine analysis
    // In practice, this would pass the token data to the analysis
    const analysis = await runMindEngine();
    
    // Map the legacy MIND engine output to our new MINDReport format
    const completeAnalysis: MINDReport = {
      timestamp: Date.now(),
      survivabilityScore: (analysis as any).survivability || 50,
      marketFlowStrength: (analysis as any).marketFlow || 50,
      consumerProfile: (analysis as any).consumerProfile || {
        shrimpPercent: 33,
        dolphinPercent: 33,
        whalePercent: 34,
        totalHolders: 0
      },
      emotionalHeatmap: [],
      regionalFlow: { regionActivity: {} },
      tradeSuggestion: {
        action: (analysis as any).action || 'HOLD',
        percentage: (analysis as any).suggestedSize || 0,
        reason: (analysis as any).reason || 'Analysis incomplete'
      },
      panicScore: (analysis as any).panicScore,
      devExhaustion: (analysis as any).devExhaustion,
      whaleActivity: (analysis as any).whaleActivity,
      volumeTrend: (analysis as any).volumeTrend,
      riskLevel: (analysis as any).riskLevel
    };
    
    return completeAnalysis;
  }`;
  
  const newMethod = `  /**
   * Analyze a specific token for emotional liquidity
   */
  private async analyzeToken(token: UnifiedToken): Promise<MINDReport> {
    console.log(\`🧠 Analyzing \${token.symbol || token.mint.slice(0, 8)}...\`);
    console.log(\`   Source: \${token.source}\`);
    if (token.emotionalScore) {
      console.log(\`   Emotional Score: \${token.emotionalScore}/100\`);
    }
    
    // Run the MIND engine analysis
    // In practice, this would pass the token data to the analysis
    const analysis = await runMindEngine();
    
    // The runMindEngine already returns a complete MINDReport
    // Just return it directly
    return analysis;
  }`;
  
  // Find the method in the content
  const methodStart = content.indexOf('/**\n   * Analyze a specific token for emotional liquidity\n   */');
  if (methodStart === -1) {
    console.error('❌ Could not find the analyzeToken method');
    process.exit(1);
  }
  
  // Find the end of the method (next method or end of class)
  let braceCount = 0;
  let inMethod = false;
  let methodEnd = methodStart;
  
  for (let i = methodStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      inMethod = true;
    } else if (content[i] === '}') {
      braceCount--;
      if (inMethod && braceCount === 0) {
        methodEnd = i + 1;
        break;
      }
    }
  }
  
  // Replace the method
  const before = content.substring(0, methodStart);
  const after = content.substring(methodEnd);
  
  content = before + newMethod + after;
  
  // Write the file
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Fixed mindCore.ts!');
  console.log('\nNow run:');
  console.log('npx ts-node src/test-mind-minimal.ts');
  
} catch (error) {
  console.error('❌ Error:', error.message);
}