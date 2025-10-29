// Simple runner for volume bot
require('dotenv').config();

console.log('Starting FATBEAR Volume Bot...');
console.log('Token:', process.env.FATBEAR_TOKEN_MINT);

// Try to run the TypeScript file directly with ts-node
try {
  require('ts-node').register({
    transpileOnly: true,
    compilerOptions: {
      module: 'commonjs',
      target: 'es2020',
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      strict: false
    }
  });
  
  require('./src/bots/volume/volumeChurnBot.ts');
} catch (error) {
  console.error('Error:', error.message);
}
