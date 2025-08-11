// config/paths.js - Centralized path configuration
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = {
  // Root directories
  ROOT,
  SRC: path.join(ROOT, 'src'),
  CONFIG: path.join(ROOT, 'config'),
  DATA: path.join(ROOT, 'data'),
  SCRIPTS: path.join(ROOT, 'scripts'),
  
  // Source subdirectories
  CORE: path.join(ROOT, 'src/core'),
  TRADING: path.join(ROOT, 'src/trading'),
  SCANNERS: path.join(ROOT, 'src/scanners'),
  ANALYSIS: path.join(ROOT, 'src/analysis'),
  UTILS: path.join(ROOT, 'src/utils'),
  
  // Data subdirectories
  LOGS: path.join(ROOT, 'data/logs'),
  MODELS: path.join(ROOT, 'data/models'),
  CACHE: path.join(ROOT, 'data/cache'),
  
  // Helper function to resolve paths
  resolve: (...segments) => path.join(ROOT, ...segments)
};