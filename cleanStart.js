#!/usr/bin/env node

// Clean Start for HootBot - Ensures only desired tokens are used
const { spawn } = require('child_process');
const path = require('path');

// Clean environment
const cleanEnv = { ...process.env };

// Remove ALL legacy token references
delete cleanEnv.TARGET_TOKEN_MINT;
delete cleanEnv.FATBEAR_TOKEN;
delete cleanEnv.TEST_TOKEN_ADDRESS;

// Ensure we only have one token
if (!cleanEnv.TARGET_TOKEN_MINT) {
  console.error('❌ TARGET_TOKEN_MINT not set in .env!');
  process.exit(1);
}

console.log('🧹 Starting HootBot with clean environment...');
console.log(`🎯 Target Token: ${cleanEnv.TARGET_TOKEN_MINT}`);

// Start smartTrader with clean environment
const smartTrader = spawn('node', ['smartTrader.js'], {
  env: cleanEnv,
  cwd: __dirname,
  stdio: 'inherit'
});

smartTrader.on('error', (err) => {
  console.error('Failed to start smartTrader:', err);
});

smartTrader.on('exit', (code) => {
  console.log(`SmartTrader exited with code ${code}`);
});
