#!/usr/bin/env node

// HootBot Clean Startup - Ensures only TARGET_TOKEN_MINT is used
const { spawn } = require('child_process');
require('dotenv').config();

// Verify TARGET_TOKEN_MINT exists
if (!process.env.TARGET_TOKEN_MINT) {
  console.error('❌ TARGET_TOKEN_MINT not set in .env!');
  console.error('Please add: TARGET_TOKEN_MINT=your_token_address to .env');
  process.exit(1);
}

// Clean environment - remove ALL legacy references
const cleanEnv = { ...process.env };
delete cleanEnv.DUTCHBROS_TOKEN_MINT;
delete cleanEnv.FATBEAR_TOKEN;
delete cleanEnv.FATBEAR_TOKEN_MINT;
delete cleanEnv.TEST_TOKEN_ADDRESS;

console.log('🧹 Starting HootBot with clean environment...');
console.log(`🎯 Target Token: ${cleanEnv.TARGET_TOKEN_MINT}`);
console.log('✅ All legacy tokens removed\n');

// Start smartTrader
const smartTrader = spawn('node', ['smartTrader.js'], {
  env: cleanEnv,
  cwd: __dirname,
  stdio: 'inherit'
});

smartTrader.on('exit', (code) => {
  console.log(`\n✨ HootBot exited with code ${code}`);
});
