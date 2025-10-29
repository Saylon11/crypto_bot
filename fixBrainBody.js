// fixBrainBody.js - Fix HootBot to use proper Scanner → MIND → Execute flow
const fs = require('fs');
const path = require('path');

console.log('🧠 Fixing HootBot Brain-Body Architecture\n');
console.log('=' .repeat(60));

// Step 1: Check current tradeExecutor implementation
console.log('\n📝 Step 1: Analyzing tradeExecutor.js...');

const tradeExecutorPath = path.join(__dirname, 'src/pumpTools/tradeExecutor.js');
let tradeExecutorContent = fs.readFileSync(tradeExecutorPath, 'utf8');

// Find where it's looking for TARGET_TOKEN_MINT
const targetTokenRegex = /process\.env\.TARGET_TOKEN_MINT/g;
const matches = tradeExecutorContent.match(targetTokenRegex);

if (matches) {
  console.log(`   Found ${matches.length} references to TARGET_TOKEN_MINT`);
  
  // Replace the logic to accept token as parameter instead
  console.log('   ✅ Updating tradeExecutor to accept dynamic tokens...');
  
  // Find the initiateCoordinatedBuy function
  const buyFunctionRegex = /async function initiateCoordinatedBuy\s*\([^)]*\)/;
  const currentSignature = tradeExecutorContent.match(buyFunctionRegex);
  
  if (currentSignature) {
    console.log(`   Current signature: ${currentSignature[0]}`);
    
    // Update function to accept tokenMint as first parameter if not already
    if (!currentSignature[0].includes('tokenMint')) {
      tradeExecutorContent = tradeExecutorContent.replace(
        /async function initiateCoordinatedBuy\s*\(/,
        'async function initiateCoordinatedBuy(tokenMint, '
      );
      
      // Also update the main function export
      tradeExecutorContent = tradeExecutorContent.replace(
        /exports\.initiateCoordinatedBuy = async \(/,
        'exports.initiateCoordinatedBuy = async (tokenMint, '
      );
    }
    
    // Replace hardcoded token references with the parameter
    tradeExecutorContent = tradeExecutorContent.replace(
      /const tokenMint = process\.env\.TARGET_TOKEN_MINT[^;]*/g,
      'const tokenMint = tokenMintParam || tokenMint'
    );
  }
  
  // Save updated tradeExecutor
  fs.writeFileSync(tradeExecutorPath + '.backup', fs.readFileSync(tradeExecutorPath));
  fs.writeFileSync(tradeExecutorPath, tradeExecutorContent);
  console.log('   💾 Updated tradeExecutor.js');
}

// Step 2: Fix smartTrader.js scanner integration
console.log('\n📝 Step 2: Fixing scanner integration in smartTrader.js...');

const smartTraderPath = path.join(__dirname, 'src/core/smartTrader.js');
let smartTraderContent = fs.readFileSync(smartTraderPath, 'utf8');

// Find the scanner section
const scannerSectionStart = smartTraderContent.indexOf('Gecko Terminal Scanner Active');
if (scannerSectionStart > -1) {
  console.log('   Found scanner section');
  
  // Create the proper scanner integration
  const properScannerIntegration = `
    // 4. Scan for new opportunities with Dynamic Token Scanner
    if (config.scanNewTokens && cycleCount % config.scanInterval === 0) {
      console.log('\\n🔍 Dynamic Token Scanner Active...');
      
      try {
        // Use the correct tokenScanner module
        const { scanAllTokens } = require('../modules/tokenScanner');
        const tokens = await scanAllTokens();
        
        if (tokens && tokens.length > 0 && tradedTokens.size < config.maxNewTokens) {
          console.log(\`\\n🎯 Scanner found \${tokens.length} potential tokens:\`);
          
          // Display top opportunities
          const topTokens = tokens.slice(0, 3);
          topTokens.forEach((token, i) => {
            console.log(\`\\n\${i + 1}. \${token.symbol || 'Unknown'}\`);
            console.log(\`   📊 Score: \${token.score}/100\`);
            console.log(\`   💰 Volume: $\${(token.volume || 0).toLocaleString()}\`);
            console.log(\`   🏷️ Mint: \${token.mint}\`);
          });
          
          // Analyze each token with MIND
          for (const token of topTokens) {
            if (token.score < 70) {
              console.log(\`\\n⏭️ Skipping \${token.symbol} - score too low (\${token.score})\`);
              continue;
            }
            
            console.log(\`\\n🧠 M.I.N.D. analyzing \${token.symbol}...\`);
            
            // Save current TOKEN_MINT and set to scanned token
            const originalToken = process.env.TOKEN_MINT;
            process.env.TOKEN_MINT = token.mint;
            
            try {
              // Run MIND analysis on the scanned token
              const tokenResult = await runMindEngine();
              sessionStats.tokensAnalyzed++;
              
              console.log(\`\\n📊 \${token.symbol} M.I.N.D. Results:\`);
              console.log(\`   🌱 Survivability: \${tokenResult.survivabilityScore}%\`);
              console.log(\`   😱 Panic Score: \${tokenResult.panicScore || 0}%\`);
              console.log(\`   📊 Action: \${tokenResult.tradeSuggestion?.action || 'WAIT'}\`);
              console.log(\`   💡 Reason: \${tokenResult.tradeSuggestion?.reason || 'No clear signal'}\`);
              
              // Execute if MIND approves
              if (tokenResult.survivabilityScore >= config.minMindScore && 
                  tokenResult.tradeSuggestion?.action === 'BUY' &&
                  sessionStats.dailySpent < config.maxDailySpend) {
                
                console.log(\`\\n✅ \${token.symbol} approved by M.I.N.D.!\`);
                
                const buySize = config.baseTradeAmount;
                
                if (!config.testMode) {
                  console.log(\`💸 Executing buy: \${buySize} SOL for \${token.symbol}\`);
                  
                  try {
                    // Pass the token mint directly to the buy function
                    await initiateCoordinatedBuy(token.mint, buySize);
                    
                    // Track new position
                    const positionData = {
                      symbol: token.symbol,
                      tokenMint: token.mint,
                      entryPrice: 1.0,
                      entrySol: buySize,
                      mindScore: tokenResult.survivabilityScore,
                      entryTime: Date.now(),
                      amount: buySize,
                      buyPrice: buySize,
                      timestamp: Date.now()
                    };
                    
                    trackNewPosition(token.mint, positionData);
                    
                    sessionStats.totalBuys++;
                    sessionStats.totalSpent += buySize;
                    sessionStats.dailySpent += buySize;
                    
                    console.log(\`✅ Successfully bought \${token.symbol}!\`);
                    
                    // Log the trade
                    analyzer.logTrade({
                      type: 'BUY',
                      token: token.symbol,
                      tokenMint: token.mint,
                      amount: buySize,
                      price: 1.0,
                      mindScore: tokenResult.survivabilityScore,
                      reason: 'Scanner → MIND → Execute'
                    });
                    
                  } catch (error) {
                    console.error(\`❌ Buy failed: \${error.message}\`);
                  }
                } else {
                  console.log(\`🧪 TEST MODE: Would buy \${buySize} SOL of \${token.symbol}\`);
                }
              } else {
                const reasons = [];
                if (tokenResult.survivabilityScore < config.minMindScore) {
                  reasons.push(\`low survivability (\${tokenResult.survivabilityScore}%)\`);
                }
                if (tokenResult.tradeSuggestion?.action !== 'BUY') {
                  reasons.push(\`MIND says \${tokenResult.tradeSuggestion?.action || 'WAIT'}\`);
                }
                console.log(\`❌ \${token.symbol} rejected: \${reasons.join(', ')}\`);
              }
              
            } catch (error) {
              console.error(\`Error analyzing \${token.symbol}:\`, error.message);
            } finally {
              // Restore original token
              process.env.TOKEN_MINT = originalToken;
            }
            
            // Small delay between analyses
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } else if (tokens.length === 0) {
          console.log('📭 No tokens found by scanner');
        } else {
          console.log(\`📭 Position limit reached (\${tradedTokens.size}/\${config.maxNewTokens})\`);
        }
      } catch (error) {
        console.error('Scanner error:', error.message);
      }
    }`;
  
  // Find and replace the scanner section
  const scannerEnd = smartTraderContent.indexOf('// 5. Display enhanced monitoring status');
  if (scannerEnd > -1) {
    const beforeScanner = smartTraderContent.substring(0, scannerSectionStart - 50);
    const afterScanner = smartTraderContent.substring(scannerEnd);
    
    smartTraderContent = beforeScanner + properScannerIntegration + '\n\n    ' + afterScanner;
    
    // Save updated smartTrader
    fs.writeFileSync(smartTraderPath + '.backup', fs.readFileSync(smartTraderPath));
    fs.writeFileSync(smartTraderPath, smartTraderContent);
    console.log('   💾 Updated smartTrader.js with proper scanner integration');
  }
}

// Step 3: Remove primary token BUY logic (it should only trade scanned tokens)
console.log('\n📝 Step 3: Updating primary token logic...');

// Find the primary token BUY section and comment it out
const primaryBuyRegex = /case 'BUY':\s*const buySize[\s\S]*?break;/;
const primaryBuyMatch = smartTraderContent.match(primaryBuyRegex);

if (primaryBuyMatch) {
  console.log('   Found primary token BUY logic');
  
  // Replace with a message
  const replacementBuy = `case 'BUY':
        console.log('\\n🔍 BUY signal detected, but we only trade scanner-discovered tokens');
        console.log('   Scanner will find better opportunities than hardcoded tokens');
        break;`;
  
  smartTraderContent = smartTraderContent.replace(primaryBuyRegex, replacementBuy);
  
  // Save again
  fs.writeFileSync(smartTraderPath, smartTraderContent);
  console.log('   ✅ Updated to focus on scanner-discovered tokens only');
}

console.log('\n' + '=' .repeat(60));
console.log('✅ Brain-Body Architecture Fixed!\n');
console.log('New flow:');
console.log('1. Scanner finds tokens');
console.log('2. MIND analyzes each token');
console.log('3. HootBot executes trades on MIND-approved tokens');
console.log('\nNo more hardcoded tokens required!');
console.log('\nRun: node src/core/smartTrader.js');