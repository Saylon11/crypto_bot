// src/pumpTools/hyperScanner.ts
// Ultra-fast token scanner for pump.fun and DEX launches

import { Connection, PublicKey } from '@solana/web3.js';
import WebSocket from 'ws';
import axios from 'axios';
import { initiateCoordinatedBuy } from './tradeExecutor';
import { runMindEngine } from '../core/mindEngine';
import { walletManager } from '../core/multiWalletManager';

interface NewToken {
  mint: string;
  symbol: string;
  name: string;
  source: string;
  timestamp: number;
  liquidity?: number;
  volume?: number;
  buyers?: number;
  isRenounced?: boolean;
  score: number;
}

export class HyperScanner {
  private connection: Connection;
  private ws: WebSocket | null = null;
  private activeScans: Set<string> = new Set();
  private quickBuyList: Set<string> = new Set();
  private scanInterval: number = 100; // 100ms between scans
  private isRunning: boolean = false;
  
  // Configuration
  private config = {
    // Speed settings
    scanDelayMs: 100,           // Check every 100ms
    quickBuyThreshold: 85,      // Instant buy if score > 85
    mindAnalysisTimeout: 5000,  // 5 second timeout for MIND
    
    // Entry criteria
    minLiquidity: 1000,         // $1k minimum
    maxMarketCap: 50000,        // $50k max for early entry
    minBuyers: 5,               // At least 5 unique buyers
    maxAgeSeconds: 300,         // Within 5 minutes of launch
    
    // Risk management
    maxPositions: 10,           // Max simultaneous positions
    positionSizeSOL: 0.01,      // Start small
    stopLossPercent: 50,        // Exit if down 50%
    takeProfitPercent: 100,     // Take initial at 2x
    
    // Wallet rotation
    useMultiWallet: true,       // Use 100-wallet system
    walletCooldownMs: 30000,    // 30 second cooldown per wallet
  };

  constructor() {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : 'https://api.mainnet-beta.solana.com';
    
    this.connection = new Connection(rpcUrl, {
      commitment: 'processed', // Fastest commitment level
      wsEndpoint: rpcUrl.replace('https', 'wss')
    });
  }

  async start() {
    console.log('🚀 HyperScanner Starting...');
    console.log('⚡ Mode: MILLISECOND SCANNING');
    console.log(`🎯 Scan Delay: ${this.config.scanDelayMs}ms`);
    console.log(`💰 Position Size: ${this.config.positionSizeSOL} SOL`);
    console.log(`🏃 Quick Buy Threshold: ${this.config.quickBuyThreshold}/100`);
    console.log('');
    
    this.isRunning = true;
    
    // Start all scanners in parallel
    await Promise.all([
      this.startWebSocketListener(),
      this.startDexScreenerScanner(),
      this.startPumpFunScanner(),
      this.startRaydiumScanner(),
      this.startPositionMonitor()
    ]);
  }

  private async startWebSocketListener() {
    // Connect to Helius WebSocket for real-time updates
    const wsUrl = process.env.HELIUS_API_KEY 
      ? `wss://atlas-mainnet.helius-rpc.com?api-key=${process.env.HELIUS_API_KEY}`
      : null;
    
    if (!wsUrl) {
      console.log('⚠️  No Helius WebSocket available, using polling only');
      return;
    }

    this.ws = new WebSocket(wsUrl);
    
    this.ws.on('open', () => {
      console.log('🔌 WebSocket connected for real-time updates');
      
      // Subscribe to new token events
      this.ws!.send(JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'transactionSubscribe',
        params: [
          {
            accountInclude: ['TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA']
          },
          {
            commitment: 'processed',
            encoding: 'jsonParsed'
          }
        ]
      }));
    });

    this.ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.params?.result?.transaction) {
          await this.processNewTokenEvent(message.params.result);
        }
      } catch (error) {
        // Silent fail for speed
      }
    });
  }

  private async startDexScreenerScanner() {
    while (this.isRunning) {
      try {
        const response = await axios.get(
          'https://api.dexscreener.com/latest/dex/tokens/solana',
          { timeout: 2000 }
        );
        
        if (response.data?.pairs) {
          const newTokens = response.data.pairs
            .filter((pair: any) => {
              const ageMs = Date.now() - (pair.pairCreatedAt || 0);
              return ageMs < this.config.maxAgeSeconds * 1000 &&
                     pair.liquidity?.usd > this.config.minLiquidity &&
                     pair.marketCap < this.config.maxMarketCap;
            })
            .map((pair: any) => ({
              mint: pair.baseToken.address,
              symbol: pair.baseToken.symbol,
              name: pair.baseToken.name,
              source: 'dexscreener',
              timestamp: pair.pairCreatedAt,
              liquidity: pair.liquidity?.usd || 0,
              volume: pair.volume?.h24 || 0,
              buyers: pair.txns?.buys || 0,
              score: this.calculateQuickScore(pair)
            }));
          
          for (const token of newTokens) {
            await this.evaluateToken(token);
          }
        }
      } catch (error) {
        // Continue scanning even on errors
      }
      
      await this.sleep(this.config.scanDelayMs);
    }
  }

  private async startPumpFunScanner() {
    // Pump.fun specific scanner
    while (this.isRunning) {
      try {
        // Try multiple endpoints
        const endpoints = [
          'https://frontend-api.pump.fun/coins',
          'https://pump.fun/api/coins',
          'https://api.pump.fun/coins'
        ];
        
        for (const endpoint of endpoints) {
          try {
            const response = await axios.get(endpoint, {
              timeout: 1000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            });
            
            if (response.data) {
              const tokens = Array.isArray(response.data) ? response.data : response.data.coins || [];
              
              const newLaunches = tokens
                .filter((token: any) => {
                  const ageMs = Date.now() - new Date(token.created_at || 0).getTime();
                  return ageMs < this.config.maxAgeSeconds * 1000 &&
                         token.market_cap < this.config.maxMarketCap;
                })
                .map((token: any) => ({
                  mint: token.mint,
                  symbol: token.symbol,
                  name: token.name,
                  source: 'pump.fun',
                  timestamp: new Date(token.created_at).getTime(),
                  liquidity: token.virtual_liquidity || 0,
                  volume: token.volume_24h || 0,
                  buyers: token.holder_count || 0,
                  isRenounced: token.is_renounced || false,
                  score: this.calculatePumpScore(token)
                }));
              
              for (const token of newLaunches) {
                await this.evaluateToken(token);
              }
              
              break; // Success, don't try other endpoints
            }
          } catch {
            continue; // Try next endpoint
          }
        }
      } catch (error) {
        // Keep scanning
      }
      
      await this.sleep(this.config.scanDelayMs * 2); // Pump.fun rate limit
    }
  }

  private async startRaydiumScanner() {
    // Monitor Raydium new pools
    while (this.isRunning) {
      try {
        // Raydium API or on-chain monitoring
        const programId = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
        
        // Get recent transactions
        const signatures = await this.connection.getSignaturesForAddress(
          programId,
          { limit: 10 },
          'processed'
        );
        
        // Process each for new pool creation
        for (const sig of signatures) {
          if (!this.activeScans.has(sig.signature)) {
            this.activeScans.add(sig.signature);
            this.processRaydiumPool(sig.signature);
          }
        }
      } catch (error) {
        // Continue
      }
      
      await this.sleep(this.config.scanDelayMs);
    }
  }

  private async evaluateToken(token: NewToken) {
    // Skip if already scanning
    if (this.activeScans.has(token.mint)) return;
    this.activeScans.add(token.mint);
    
    const startTime = Date.now();
    
    console.log(`\n⚡ New ${token.source} token: ${token.symbol}`);
    console.log(`   Age: ${Math.floor((Date.now() - token.timestamp) / 1000)}s`);
    console.log(`   Quick Score: ${token.score}/100`);
    
    try {
      // INSTANT BUY if score is exceptional
      if (token.score >= this.config.quickBuyThreshold) {
        console.log(`🔥 INSTANT BUY TRIGGERED! Score: ${token.score}`);
        await this.executeBuy(token, 'QUICK_BUY');
        return;
      }
      
      // Quick MIND analysis with timeout
      if (token.score >= 70) {
        const mindPromise = this.quickMindAnalysis(token);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('MIND timeout')), this.config.mindAnalysisTimeout)
        );
        
        try {
          const mindResult = await Promise.race([mindPromise, timeoutPromise]) as any;
          
          console.log(`   MIND Score: ${mindResult.survivabilityScore}%`);
          console.log(`   Decision Time: ${Date.now() - startTime}ms`);
          
          if (mindResult.survivabilityScore >= 60 && mindResult.action === 'BUY') {
            await this.executeBuy(token, 'MIND_APPROVED');
          }
        } catch (error) {
          console.log(`   MIND timeout - using quick score only`);
          if (token.score >= 80) {
            await this.executeBuy(token, 'TIMEOUT_FALLBACK');
          }
        }
      }
    } finally {
      this.activeScans.delete(token.mint);
    }
  }

  private async executeBuy(token: NewToken, reason: string) {
    try {
      console.log(`\n💰 EXECUTING BUY: ${token.symbol}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Amount: ${this.config.positionSizeSOL} SOL`);
      
      // Get next wallet from pool
      const wallet = this.config.useMultiWallet 
        ? walletManager.getNextWallet()
        : walletManager.getMainWallet();
      
      console.log(`   Wallet: ${wallet.publicKey.toBase58().substring(0, 8)}...`);
      
      // Execute trade
      const result = await initiateCoordinatedBuy(
        token.mint,
        this.config.positionSizeSOL,
        wallet
      );
      
      if (result.signature) {
        console.log(`✅ SUCCESS: ${result.signature}`);
        this.quickBuyList.add(token.mint);
        
        // Start monitoring position
        this.monitorPosition(token);
      }
    } catch (error: any) {
      console.log(`❌ Buy failed: ${error.message}`);
    }
  }

  private async monitorPosition(token: NewToken) {
    // Monitor for stop loss and take profit
    const entryTime = Date.now();
    const checkInterval = 1000; // Check every second
    
    const monitor = setInterval(async () => {
      try {
        // Get current price (simplified)
        const currentPrice = await this.getTokenPrice(token.mint);
        const priceChange = ((currentPrice - 1) * 100); // Simplified
        
        console.log(`📊 ${token.symbol}: ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(1)}%`);
        
        // Take profit
        if (priceChange >= this.config.takeProfitPercent) {
          console.log(`🎯 TAKE PROFIT: ${token.symbol} +${priceChange}%`);
          // Execute sell
          clearInterval(monitor);
        }
        
        // Stop loss
        if (priceChange <= -this.config.stopLossPercent) {
          console.log(`🛑 STOP LOSS: ${token.symbol} ${priceChange}%`);
          // Execute sell
          clearInterval(monitor);
        }
        
        // Time-based exit (5 minutes)
        if (Date.now() - entryTime > 5 * 60 * 1000) {
          console.log(`⏰ TIME EXIT: ${token.symbol}`);
          clearInterval(monitor);
        }
      } catch (error) {
        // Continue monitoring
      }
    }, checkInterval);
  }

  private calculateQuickScore(data: any): number {
    let score = 50; // Base score
    
    // Liquidity score (0-20)
    if (data.liquidity?.usd > 10000) score += 20;
    else if (data.liquidity?.usd > 5000) score += 15;
    else if (data.liquidity?.usd > 2000) score += 10;
    else if (data.liquidity?.usd > 1000) score += 5;
    
    // Volume score (0-20)
    if (data.volume?.m5 > 10000) score += 20;
    else if (data.volume?.m5 > 5000) score += 15;
    else if (data.volume?.m5 > 1000) score += 10;
    
    // Buyer activity (0-20)
    const buyRatio = data.txns?.buys / (data.txns?.total || 1);
    if (buyRatio > 0.7) score += 20;
    else if (buyRatio > 0.6) score += 15;
    else if (buyRatio > 0.5) score += 10;
    
    // Fresh launch bonus
    const ageMinutes = (Date.now() - data.pairCreatedAt) / 60000;
    if (ageMinutes < 1) score += 15;
    else if (ageMinutes < 5) score += 10;
    else if (ageMinutes < 15) score += 5;
    
    return Math.min(score, 100);
  }

  private calculatePumpScore(token: any): number {
    let score = 60; // Pump.fun base score (verified contract)
    
    // Renounced bonus
    if (token.is_renounced) score += 10;
    
    // Early bird bonus
    const ageMinutes = (Date.now() - new Date(token.created_at).getTime()) / 60000;
    if (ageMinutes < 2) score += 20;
    else if (ageMinutes < 5) score += 15;
    else if (ageMinutes < 10) score += 10;
    
    // Holder growth
    if (token.holder_count > 50) score += 10;
    else if (token.holder_count > 20) score += 5;
    
    // Volume momentum
    if (token.volume_5m > 1000) score += 10;
    
    return Math.min(score, 100);
  }

  private async quickMindAnalysis(token: NewToken): Promise<any> {
    // Simplified MIND analysis for speed
    process.env.TARGET_TOKEN_MINT = token.mint;
    process.env.HELIUS_TARGET_WALLET = token.mint;
    
    // Run MIND with minimal analysis
    const result = await runMindEngine();
    
    return {
      survivabilityScore: result.survivabilityScore || 0,
      action: result.tradeSuggestion?.action || 'HOLD'
    };
  }

  private async getTokenPrice(mint: string): Promise<number> {
    // Simplified - in production, get actual price
    return 1 + (Math.random() * 0.4 - 0.2); // Random -20% to +20%
  }

  private async processNewTokenEvent(event: any) {
    // Process WebSocket events
    console.log('🔔 New token event detected');
  }

  private async processRaydiumPool(signature: string) {
    // Process new Raydium pools
    console.log('🌊 New Raydium pool:', signature.substring(0, 8) + '...');
  }

  private async startPositionMonitor() {
    // Global position monitoring
    while (this.isRunning) {
      if (this.quickBuyList.size > 0) {
        console.log(`\n📈 Monitoring ${this.quickBuyList.size} positions...`);
      }
      await this.sleep(5000); // Check every 5 seconds
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.isRunning = false;
    if (this.ws) {
      this.ws.close();
    }
    console.log('🛑 HyperScanner stopped');
  }
}

// Export for use
export async function startHyperScanner() {
  const scanner = new HyperScanner();
  await scanner.start();
  
  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 Shutting down...');
    scanner.stop();
    process.exit(0);
  });
}

// Run if called directly
if (require.main === module) {
  startHyperScanner().catch(console.error);
}