#!/bin/bash
# Fix the shutdown handler to include report generation

cd ~/Desktop/HootBot

echo "🔧 Adding report generation to shutdown handler..."

# First, let's check what the shutdown handler looks like
echo "📍 Looking for shutdown handler..."
grep -n "SIGINT" src/pumpTools/smartTrader.js

# Add the report generation manually
# This looks for the process.on('SIGINT' pattern and adds our code
perl -i -pe '
# Find the SIGINT handler and add report generation
if (/process\.on\(.SIGINT., /) {
    $inside_handler = 1;
}
if ($inside_handler && /console\.log\(.\\n\\n👋 Shutting down gracefully/) {
    $_ .= "\n  \n  // Generate session analysis report\n  console.log('\''\\n📊 Generating session analysis...'\'');\n  analyzer.generateReport();\n  analyzer.exportToCSV();\n";
    $inside_handler = 0;
}
' src/pumpTools/smartTrader.js

# Alternative approach - add it before process.exit
perl -i -pe '
if (/process\.exit\(0\);/) {
    print "  // Generate final analysis\n";
    print "  try {\n";
    print "    analyzer.generateReport();\n";
    print "    analyzer.exportToCSV();\n";
    print "  } catch (error) {\n";
    print "    console.error('\''Error generating report:'\'', error.message);\n";
    print "  }\n  \n";
}
' src/pumpTools/smartTrader.js

# Verify it was added
echo -e "\n✅ Checking if report generation was added..."
if grep -q "analyzer.generateReport" src/pumpTools/smartTrader.js; then
    echo "✅ Report generation successfully added!"
    echo "📍 Found at:"
    grep -n "analyzer.generateReport" src/pumpTools/smartTrader.js
else
    echo "⚠️ Could not automatically add report generation"
    echo "📝 Please add this manually in the shutdown handler (Ctrl+C handler):"
    echo ""
    echo "  // Generate session analysis report"
    echo "  analyzer.generateReport();"
    echo "  analyzer.exportToCSV();"
fi

echo -e "\n✨ Done! You're ready to run HootBot with full session tracking!"