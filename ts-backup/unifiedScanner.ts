// HootBot/src/scanners/unifiedScanner.ts
import { Connection } from '@solana/web3.js';
import { TokenSnapshot, GemScanner } from './gemScanner';
// Legacy scanner imports - adjust paths as needed
// import { scanAllTokens as scanLegacyTokens } from '../pumpTools/tokenScanner';
// import { scanPumpTokens } from './pumpScanner';

export interface UnifiedToken extends TokenSnapshot {
  source: 'pump' | 'dexscreener' | 'jupiter' | 'raydium' | 'gem-scanner';
  scannerScore?: number; // Legacy scanner score
  emotionalScore?: number; // New emotional liquidity score
}

/**
 * Unified scanner that combines all scanning sources
 */
export class UnifiedScanner {
  private gemScanner: GemScanner;
  private connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
    this.gemScanner = new GemScanner(connection);
  }
  
  /**
   * Scan all sources and return unified results
   */
  async scanAll(): Promise<UnifiedToken[]> {
    console.log('🔍 Starting unified scan across all sources...');
    
    const results: UnifiedToken[] = [];
    
    try {
      // 1. Use the new gem scanner
      const gemTokens = await this.gemScanner.scan({
        minMarketCap: 10000,
        maxMarketCap: 10000000,
        minVolume24h: 1000,
        minHolders: 50,
        includeGraduated: true,
        includePumpFun: true
      });
      
      // Add gem scanner results
      for (const gem of gemTokens) {
        results.push({
          ...gem,
          source: gem.isGraduated ? 'raydium' : 'pump',
          emotionalScore: this.calculateEmotionalScore(gem)
        } as UnifiedToken);
      }
      
      console.log(`   ✅ Gem Scanner: ${gemTokens.length} tokens`);
      
    } catch (error) {
      console.error('   ❌ Gem Scanner error:', error);
    }
    
    try {
      // 2. Use legacy scanners (if available)
      // TODO: Uncomment when legacy scanners are properly configured
      /*
      const { scanAllTokens } = require('../pumpTools/tokenScanner');
      const legacyTokens = await scanAllTokens();
      
      // Add unique tokens from legacy scanners
      for (const token of legacyTokens) {
        const exists = results.find(r => r.mint === token.mint);
        if (!exists) {
          results.push({
            mint: token.mint,
            symbol: token.symbol,
            name: token.name,
            marketCap: 0, // Legacy doesn't provide this
            volume24h: token.volume || 0,
            priceChange24h: 0,
            holders: 0,
            isGraduated: token.source !== 'pump',
            createdAt: Date.now(),
            lastTradeAt: Date.now(),
            source: token.source as any,
            scannerScore: token.score
          } as UnifiedToken);
        }
      }
      
      console.log(`   ✅ Legacy Scanners: ${legacyTokens.length} tokens`);
      */
      console.log(`   ⚠️  Legacy Scanners: Disabled (configuration needed)`);
      
    } catch (error) {
      console.error('   ❌ Legacy Scanner error:', error);
    }
    
    // 3. Sort by combined score
    results.sort((a, b) => {
      const scoreA = a.emotionalScore || a.scannerScore || 0;
      const scoreB = b.emotionalScore || b.scannerScore || 0;
      return scoreB - scoreA;
    });
    
    console.log(`\n✅ Total unique tokens found: ${results.length}`);
    
    return results;
  }
  
  /**
   * Calculate emotional liquidity score for ranking
   */
  private calculateEmotionalScore(token: TokenSnapshot): number {
    let score = 50; // Base score
    
    // Volume/MCap ratio (liquidity indicator)
    if (token.marketCap > 0) {
      const volumeRatio = token.volume24h / token.marketCap;
      if (volumeRatio > 0.5) score += 20;
      else if (volumeRatio > 0.2) score += 10;
      else if (volumeRatio > 0.1) score += 5;
    }
    
    // Holder distribution
    if (token.holders > 500) score += 15;
    else if (token.holders > 200) score += 10;
    else if (token.holders > 100) score += 5;
    
    // Age factor (newer = higher potential)
    const ageHours = (Date.now() - token.createdAt) / (1000 * 60 * 60);
    if (ageHours < 24) score += 10;
    else if (ageHours < 72) score += 5;
    
    // Graduation bonus
    if (token.isGraduated) score += 10;
    
    // Dev holdings penalty
    if (token.devHoldings && token.devHoldings > 20) {
      score -= 15;
    }
    
    return Math.min(Math.max(score, 0), 100);
  }
  
  /**
   * Get top opportunities based on emotional liquidity
   */
  async getTopOpportunities(limit: number = 5): Promise<UnifiedToken[]> {
    const allTokens = await this.scanAll();
    return allTokens.slice(0, limit);
  }
}

/**
 * Singleton instance
 */
let scannerInstance: UnifiedScanner | null = null;

/**
 * Get unified scanner instance
 */
export function getUnifiedScanner(connection?: Connection): UnifiedScanner {
  if (!scannerInstance) {
    const conn = connection || new Connection(
      process.env.HELIUS_RPC_URL || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    );
    scannerInstance = new UnifiedScanner(conn);
  }
  return scannerInstance;
}

/**
 * Quick scan function for easy access
 */
export async function scanForOpportunities(): Promise<UnifiedToken[]> {
  const scanner = getUnifiedScanner();
  return scanner.scanAll();
}