// HootBot/src/scanners/integratedMarketScanner.ts

import { TokenSnapshot } from '../types/index';
import { scanAllTokens } from '../pumpTools/tokenScanner';
import { UnifiedScanner } from './unifiedScanner';
import { ScannerIntegration } from './scannerIntegration';

interface ScanFilters {
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume?: number;
  minLiquidity?: number;
  excludeGraduated?: boolean;
}

interface MarketScanResult {
  pumpTokens: TokenSnapshot[];
  raydiumTokens: TokenSnapshot[];
  allTokens: TokenSnapshot[];
  timestamp: number;
}

/**
 * Integrated scanner that combines Pump.fun and Raydium scanning
 * Implements the Brain-Body doctrine: M.I.N.D. receives complete market data
 */
export class IntegratedMarketScanner {
  private unifiedScanner: UnifiedScanner;
  private scannerIntegration: ScannerIntegration | null = null;
  private lastScanResult: MarketScanResult | null = null;
  private scanCooldown: number = 30000; // 30 second cooldown between full scans
  private lastScanTime: number = 0;

  constructor() {
    this.unifiedScanner = new UnifiedScanner();
    
    // Try to initialize scanner integration if available
    try {
      this.scannerIntegration = new ScannerIntegration();
    } catch (e) {
      console.log('📊 ScannerIntegration not available, using direct scanners');
    }
  }

  /**
   * Main entry point - scans both Pump.fun and Raydium markets
   */
  async scanAllMarkets(filters: ScanFilters = {}): Promise<MarketScanResult> {
    // Check cooldown
    const now = Date.now();
    if (this.lastScanResult && (now - this.lastScanTime) < this.scanCooldown) {
      console.log('⏱️ Using cached scan results (cooldown active)');
      return this.lastScanResult;
    }

    console.log('🔍 Starting integrated market scan...');
    console.log(`📋 Filters:`, filters);
    
    // Parallel scan both markets
    const [pumpTokens, raydiumTokens] = await Promise.all([
      this.scanPumpFun(filters),
      this.scanGraduated(filters)
    ]);
    
    // Combine and deduplicate
    const tokenMap = new Map<string, TokenSnapshot>();
    
    // Add pump tokens first (they have priority if duplicate)
    pumpTokens.forEach(token => tokenMap.set(token.mint, token));
    
    // Add raydium tokens (skip if already exists from pump)
    raydiumTokens.forEach(token => {
      if (!tokenMap.has(token.mint)) {
        tokenMap.set(token.mint, token);
      } else {
        // Update graduated status if token exists on both
        const existing = tokenMap.get(token.mint)!;
        existing.graduated = true;
        existing.source = 'both' as any;
      }
    });
    
    const allTokens = Array.from(tokenMap.values());
    
    // Sort by volume for relevance
    allTokens.sort((a, b) => b.volume24h - a.volume24h);
    
    const result: MarketScanResult = {
      pumpTokens,
      raydiumTokens,
      allTokens,
      timestamp: now
    };
    
    // Cache result
    this.lastScanResult = result;
    this.lastScanTime = now;
    
    // Log summary
    console.log(`\n📊 Integrated Scan Complete:`);
    console.log(`   ⛲ Pump.fun tokens: ${pumpTokens.length}`);
    console.log(`   🌊 Raydium tokens: ${raydiumTokens.length}`);
    console.log(`   🎯 Total unique tokens: ${allTokens.length}`);
    console.log(`   🔄 Tokens on both DEXs: ${pumpTokens.length + raydiumTokens.length - allTokens.length}`);
    
    return result;
  }

  /**
   * Scan Pump.fun for pre-graduated tokens
   */
  private async scanPumpFun(filters: ScanFilters): Promise<TokenSnapshot[]> {
    try {
      console.log('⛲ Scanning Pump.fun tokens...');
      
      // Use existing pump scanner
      const rawTokens = await scanAllTokens();
      
      // Convert and filter
      const tokens = rawTokens
        .filter(token => {
          // Apply filters
          if (filters.minMarketCap && token.marketCap < filters.minMarketCap) return false;
          if (filters.maxMarketCap && token.marketCap > filters.maxMarketCap) return false;
          if (filters.minVolume && token.volume24h < filters.minVolume) return false;
          if (filters.excludeGraduated && token.graduated) return false;
          
          // Quality filters
          if (token.marketCap < 1000) return false; // Min $1k market cap
          if (token.volume24h < 100) return false; // Min $100 daily volume
          
          return true;
        })
        .map(token => ({
          mint: token.mint,
          symbol: token.symbol || 'UNKNOWN',
          name: token.name || 'Unknown Token',
          price: token.price || 0,
          marketCap: token.marketCap || 0,
          volume24h: token.volume24h || 0,
          liquidity: token.liquidity || 0,
          holders: token.holders || 0,
          priceChange24h: token.priceChange24h || 0,
          graduated: false,
          source: 'pumpfun' as const,
          timestamp: Date.now(),
          ageHours: token.ageHours || 0,
          score: token.score || 0
        }));
      
      console.log(`✅ Found ${tokens.length} Pump.fun tokens after filtering`);
      
      // Log top 3
      tokens.slice(0, 3).forEach((token, i) => {
        console.log(`   ${i + 1}. ${token.symbol}: MC $${token.marketCap.toLocaleString()}, Vol $${token.volume24h.toLocaleString()}`);
      });
      
      return tokens;
      
    } catch (error) {
      console.error('❌ Error scanning Pump.fun:', error);
      return [];
    }
  }

  /**
   * Scan Raydium for graduated tokens
   */
  private async scanGraduated(filters: ScanFilters): Promise<TokenSnapshot[]> {
    try {
      console.log('🌊 Scanning Raydium/graduated tokens...');
      
      // Try unified scanner first
      if (this.unifiedScanner) {
        try {
          const tokens = await this.unifiedScanner.scanTokens({
            source: 'raydium',
            limit: 100,
            minVolume: filters.minVolume,
            minLiquidity: filters.minLiquidity || 10000,
          });
          
          if (tokens.length > 0) {
            console.log(`✅ Found ${tokens.length} tokens via UnifiedScanner`);
            return this.applyFilters(tokens, filters);
          }
        } catch (e) {
          console.log('⚠️ UnifiedScanner failed, trying fallback...');
        }
      }
      
      // Fallback to DexScreener
      return await this.scanDexScreener(filters);
      
    } catch (error) {
      console.error('❌ Error scanning graduated tokens:', error);
      return [];
    }
  }

  /**
   * DexScreener fallback for Raydium tokens
   */
  private async scanDexScreener(filters: ScanFilters): Promise<TokenSnapshot[]> {
    try {
      console.log('🔄 Using DexScreener API...');
      
      const response = await fetch('https://api.dexscreener.com/latest/dex/pairs/solana');
      const data = await response.json();
      
      if (!data.pairs) {
        console.warn('⚠️ No pairs data from DexScreener');
        return [];
      }
      
      // Filter for Raydium pairs
      const tokens: TokenSnapshot[] = data.pairs
        .filter((pair: any) => 
          pair.dexId === 'raydium' && 
          pair.baseToken.address !== 'So11111111111111111111111111111111111111112' &&
          pair.liquidity?.usd > 5000 // Min $5k liquidity
        )
        .map((pair: any) => ({
          mint: pair.baseToken.address,
          symbol: pair.baseToken.symbol || 'UNKNOWN',
          name: pair.baseToken.name || pair.baseToken.symbol || 'Unknown',
          price: parseFloat(pair.priceUsd) || 0,
          marketCap: parseFloat(pair.fdv || pair.marketCap) || 0,
          volume24h: parseFloat(pair.volume?.h24 || 0),
          liquidity: parseFloat(pair.liquidity?.usd || 0),
          holders: 0,
          priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
          graduated: true,
          source: 'raydium' as const,
          timestamp: Date.now(),
          pairAddress: pair.pairAddress,
          txns24h: pair.txns?.h24 || 0,
        }));
      
      const filtered = this.applyFilters(tokens, filters);
      console.log(`✅ Found ${filtered.length} Raydium tokens after filtering`);
      
      // Log top 3
      filtered.slice(0, 3).forEach((token, i) => {
        console.log(`   ${i + 1}. ${token.symbol}: MC $${token.marketCap.toLocaleString()}, Vol $${token.volume24h.toLocaleString()}`);
      });
      
      return filtered;
      
    } catch (error) {
      console.error('❌ DexScreener API error:', error);
      return [];
    }
  }

  /**
   * Apply filters to token array
   */
  private applyFilters(tokens: TokenSnapshot[], filters: ScanFilters): TokenSnapshot[] {
    return tokens
      .filter(token => {
        if (filters.minMarketCap && token.marketCap < filters.minMarketCap) return false;
        if (filters.maxMarketCap && token.marketCap > filters.maxMarketCap) return false;
        if (filters.minVolume && token.volume24h < filters.minVolume) return false;
        if (filters.minLiquidity && token.liquidity < filters.minLiquidity) return false;
        
        return true;
      })
      .sort((a, b) => b.volume24h - a.volume24h);
  }

  /**
   * Get tokens that recently graduated from Pump to Raydium
   */
  async findRecentGraduates(hoursAgo: number = 24): Promise<TokenSnapshot[]> {
    const result = await this.scanAllMarkets({
      minLiquidity: 10000, // Graduated tokens have higher liquidity
      minVolume: 5000
    });
    
    // Find tokens that exist on both platforms
    const graduatedMints = new Set(
      result.raydiumTokens.map(t => t.mint)
    );
    
    const recentGraduates = result.pumpTokens.filter(token => 
      graduatedMints.has(token.mint) && 
      token.ageHours && token.ageHours < hoursAgo
    );
    
    console.log(`\n🎓 Found ${recentGraduates.length} recent graduates`);
    return recentGraduates;
  }

  /**
   * Get market movers across both DEXs
   */
  async getMarketMovers(limit: number = 10): Promise<{
    topGainers: TokenSnapshot[];
    topVolume: TokenSnapshot[];
    newListings: TokenSnapshot[];
  }> {
    const result = await this.scanAllMarkets({
      minVolume: 1000,
      minLiquidity: 5000
    });
    
    // Sort by price change
    const topGainers = [...result.allTokens]
      .filter(t => t.priceChange24h > 0)
      .sort((a, b) => (b.priceChange24h || 0) - (a.priceChange24h || 0))
      .slice(0, limit);
    
    // Sort by volume
    const topVolume = [...result.allTokens]
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, limit);
    
    // Find new listings (less than 24 hours old)
    const newListings = [...result.allTokens]
      .filter(t => t.ageHours && t.ageHours < 24)
      .sort((a, b) => (a.ageHours || 0) - (b.ageHours || 0))
      .slice(0, limit);
    
    return { topGainers, topVolume, newListings };
  }
}

// Export singleton instance
export const integratedMarketScanner = new IntegratedMarketScanner();

// Export for testing
export async function testIntegratedScanner() {
  console.log('🧪 Testing Integrated Market Scanner...\n');
  
  const scanner = new IntegratedMarketScanner();
  
  // Test 1: Basic scan
  const results = await scanner.scanAllMarkets({
    minMarketCap: 10000,
    maxMarketCap: 5000000,
    minVolume: 5000,
    minLiquidity: 10000
  });
  
  console.log('\n📊 Scan Results Summary:');
  console.log(`Total tokens found: ${results.allTokens.length}`);
  
  // Test 2: Find recent graduates
  const graduates = await scanner.findRecentGraduates(48);
  console.log(`\n🎓 Recent graduates (48h): ${graduates.length}`);
  
  // Test 3: Get market movers
  const movers = await scanner.getMarketMovers(5);
  console.log('\n📈 Market Movers:');
  console.log(`Top gainers: ${movers.topGainers.length}`);
  console.log(`Top volume: ${movers.topVolume.length}`);
  console.log(`New listings: ${movers.newListings.length}`);
}