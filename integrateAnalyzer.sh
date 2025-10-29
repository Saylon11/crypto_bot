#!/bin/bash
# integrateAnalyzer.sh - Automatically integrate SessionAnalyzer into smartTrader.js

cd ~/Desktop/HootBot

echo "🔧 Integrating SessionAnalyzer into smartTrader.js..."

# Backup the original file
cp src/pumpTools/smartTrader.js src/pumpTools/smartTrader.js.backup
echo "✅ Created backup: smartTrader.js.backup"

# Create a temporary file with the modifications
cat > /tmp/analyzer_integration.js << 'EOF'
// Add after other requires at the top
const { getAnalyzer } = require('../sessionAnalyzer');
const analyzer = getAnalyzer();

// After config, set analyzer config
analyzer.setConfig({
  mode: config.testMode ? 'TEST' : 'LIVE',
  baseTradeAmount: config.baseTradeAmount,
  minMindScore: config.minMindScore,
  stopLoss: config.stopLossPercentage,
  profitTargets: [config.profitTarget1, config.profitTarget2, config.profitTarget3]
});
EOF

# Now let's modify the smartTrader.js file
echo "📝 Adding SessionAnalyzer integration..."

# Use perl for more reliable multiline replacements (macOS compatible)
perl -i -pe '
# Add analyzer require after other requires
if (/const dotenv = require\(.dotenv.\);/) {
    $_ .= "\n// Session analyzer for performance tracking\nconst { getAnalyzer } = require('\''../sessionAnalyzer'\'');\nconst analyzer = getAnalyzer();\n";
}

# Add analyzer config after main config
if (/verboseLogging: true,.*\n\};/) {
    $_ .= "\n\n// Set analyzer configuration\nanalyzer.setConfig({\n  mode: config.testMode ? '\''TEST'\'' : '\''LIVE'\'',\n  baseTradeAmount: config.baseTradeAmount,\n  minMindScore: config.minMindScore,\n  stopLoss: config.stopLossPercentage,\n  profitTargets: [config.profitTarget1, config.profitTarget2, config.profitTarget3]\n});\n";
}
' src/pumpTools/smartTrader.js

# Add trade logging after successful BUY
echo "📊 Adding trade logging..."

# Create a more targeted modification for trade logging
perl -i -pe '
# Add MIND snapshot logging after analysis
if (/const mindResult = await runMindEngine\(\);/) {
    $_ .= "\n\n      // Log MIND analysis\n      analyzer.logMindSnapshot({\n        token: candidate.symbol,\n        ...mindResult\n      });\n\n      // Log decision\n      analyzer.logDecision({\n        token: candidate.symbol,\n        tokenMint: candidate.mint,\n        action: extractMindAction(mindResult),\n        mindScore: mindResult.survivabilityScore,\n        executed: action === '\''BUY'\'' && mindResult.survivabilityScore >= config.minMindScore,\n        reason: mindResult.tradeSuggestion?.reason,\n        ...mindResult\n      });\n";
}

# Add trade logging after successful buy
if (/console\.log\(.✅ AGGRESSIVE POSITION OPENED!.\);/) {
    $_ .= "\n\n                    // Log the trade\n                    analyzer.logTrade({\n                      type: '\''BUY'\'',\n                      token: candidate.symbol,\n                      tokenMint: candidate.mint,\n                      amount: tradeSize,\n                      price: tradeSize / 1000, // Estimate\n                      mindScore: mindResult.survivabilityScore,\n                      reason: mindResult.tradeSuggestion?.reason,\n                      panicScore: mindResult.panicScore,\n                      devExhaustion: mindResult.devExhaustion?.remainingPercentage,\n                      whaleActivity: mindResult.whaleActivity,\n                      consumerProfile: mindResult.consumerProfile\n                    });\n";
}

# Add sell logging
if (/sessionStats\.totalSells\+\+;/) {
    $_ .= "\n            // Log the sell\n            analyzer.logTrade({\n              type: estimatedChange <= -config.stopLossPercentage ? '\''EXIT'\'' : '\''SELL'\'',\n              token: position.symbol,\n              tokenMint: tokenMint,\n              amount: currentBalance * (sellPercentage / 100),\n              price: position.buyPrice * (1 + estimatedChange / 100),\n              mindScore: mindResult.survivabilityScore,\n              reason: estimatedChange <= -config.stopLossPercentage ? '\''Stop loss'\'' : '\''Profit target'\'',\n              result: estimatedChange > 0 ? '\''profit'\'' : '\''loss'\'',\n              panicScore: mindResult.panicScore\n            });\n";
}
' src/pumpTools/smartTrader.js

# Update shutdown handler
echo "🛑 Updating shutdown handler..."

perl -i -pe '
# Add report generation in shutdown handler
if (/console\.log\(.\\n👋 Shutting down gracefully\.\.\..?\);/) {
    $_ .= "\n  \n  // Generate session analysis report\n  analyzer.generateReport();\n  analyzer.exportToCSV();\n";
}
' src/pumpTools/smartTrader.js

# Verify the integration
echo -e "\n✅ Integration complete! Checking..."

# Check if analyzer was added
if grep -q "getAnalyzer" src/pumpTools/smartTrader.js; then
    echo "✅ SessionAnalyzer import added"
else
    echo "⚠️ SessionAnalyzer import might be missing"
fi

if grep -q "analyzer.logTrade" src/pumpTools/smartTrader.js; then
    echo "✅ Trade logging added"
else
    echo "⚠️ Trade logging might be missing"
fi

if grep -q "analyzer.generateReport" src/pumpTools/smartTrader.js; then
    echo "✅ Report generation added"
else
    echo "⚠️ Report generation might be missing"
fi

echo -e "\n📁 Backup saved as: src/pumpTools/smartTrader.js.backup"
echo "📊 SessionAnalyzer is now integrated!"
echo -e "\n🦉 Run HootBot and all trades will be automatically tracked!"
echo "📈 Session reports will be saved in the logs/ directory"