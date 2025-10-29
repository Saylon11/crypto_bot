#!/bin/bash

# Update mindCore.ts to use MINDReport from mindEngine instead of types/mind
sed -i '' '1,10s/import { MINDReport } from '\''\.\.\/types\/mind'\'';/\/\/ Using MINDReport from mindEngine/' src/mind/mindCore.ts

# Make sure we import from mindEngine
if ! grep -q "import { runMindEngine } from '../mindEngine'" src/mind/mindCore.ts; then
  sed -i '' '3i\
import { runMindEngine } from '\''../mindEngine'\'';
' src/mind/mindCore.ts
fi

echo "✅ Fixed imports in mindCore.ts"
