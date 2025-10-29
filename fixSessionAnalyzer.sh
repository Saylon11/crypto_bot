#!/bin/bash
# Fix the sessionAnalyzer.js file by removing the EOF line

cd ~/Desktop/HootBot

echo "🔧 Fixing sessionAnalyzer.js..."

# Check if the file has EOF at the end
if tail -1 src/sessionAnalyzer.js | grep -q "EOF"; then
    echo "✅ Found EOF at end of file, removing it..."
    # Remove the last line if it contains EOF
    sed -i '' '$d' src/sessionAnalyzer.js
    echo "✅ EOF removed"
else
    echo "🤔 EOF not found at end of file"
    echo "Checking for other issues..."
    
    # Check the last few lines
    echo "Last 5 lines of sessionAnalyzer.js:"
    tail -5 src/sessionAnalyzer.js
fi

# Verify the file ends correctly
echo -e "\n📝 Verifying file structure..."
if tail -3 src/sessionAnalyzer.js | grep -q "module.exports"; then
    echo "✅ File appears to end correctly with module.exports"
else
    echo "⚠️ File might be truncated. Adding proper ending..."
    
    # Add the proper ending if missing
    cat >> src/sessionAnalyzer.js << 'ENDOFFILE'

module.exports = { 
  SessionAnalyzer,
  getAnalyzer
};