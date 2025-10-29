#!/bin/bash

# Find the start and end of the MINDReport interface
# We'll replace from "export interface MINDReport" to the closing brace

cat > temp-interface.txt << 'INTERFACE'
export interface MINDReport {
  // Core metrics
  survivabilityScore: number;
  consumerProfile: ConsumerProfile;
  emotionalHeatmap: string[];
  regionalFlow: RegionalLiquidityReport;
  marketFlowStrength: number;
  
  // Trade directive
  tradeSuggestion: {
    action: "BUY" | "SELL" | "HOLD" | "PAUSE" | "EXIT";
    percentage: number;
    reason: string;
  };
  
  // Additional insights
  panicScore?: number;
  devExhaustion?: DevExhaustionResult;
  herdSentiment?: HerdSentimentReport;
  walletDistribution?: WalletProfileReport;
  peakTradingHours?: number[];
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  whaleActivity?: boolean;
  volumeTrend?: 'increasing' | 'decreasing' | 'stable';
}
INTERFACE

# Use awk to replace the interface
awk '
/export interface MINDReport/ {
    print "// [REPLACED BY SCRIPT]"
    system("cat temp-interface.txt")
    skip = 1
}
skip && /^}/ {
    skip = 0
    next
}
!skip {
    print
}
' src/mindEngine.ts > src/mindEngine.ts.new

# Replace the original file
mv src/mindEngine.ts.new src/mindEngine.ts

# Clean up
rm temp-interface.txt

echo "✅ Fixed MINDReport interface in mindEngine.ts"
