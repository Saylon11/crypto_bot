// HootBot/src/scanners/graduatedTokenScanner.ts

import { TokenSnapshot } from '../types/index';

interface DexScreenerPair {
  chainId: string;
  dexId: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    symbol: string;
  };
  priceUsd: string;
  priceChange: {
    h24: number;
    h6: number;
    h1: number;
  };
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  volume: {
    h24: number;
    h6: number;
    h1: number;
  };
  txns: {
    h24: number;
    h6: number;
    h1: number;
  };
  marketCap?: number;
  fdv?: number;
}

/**
 * Dedicated scanner for graduated tokens on Raydium
 * This replaces the empty scanGraduated() function
 */
export class GraduatedTokenScanner {
  private readonly DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/pairs/solana';
  private readonly JUPITER_TOP_TOKENS = 'https://cache.jup.ag/top-tokens';
  private readonly JUPITER_PRICE_API = 'https://price.jup.ag/v4/price';
  private readonly MIN_LIQUIDITY = 5000; // $5k minimum
  private readonly MIN_VOLUME = 1000; // $1k minimum daily volume

  /**
   * Main scanning function for graduated tokens
   */
  async scanGraduated(filters: {
    minMarketCap?: number;
    maxMarketCap?: number;
    minVolume?: number;
    minLiquidity?: number;
    limit?: number;
  } = {}): Promise<TokenSnapshot[]> {
    console.log('🌊 Scanning graduated tokens on Raydium...');
    
    try {
      // Primary method: DexScreener (most reliable for Raydium data)
      const tokens = await this.scanViaDexScreener(filters);
      
      if (tokens.length > 0) {
        return tokens;
      }
      
      // Fallback: Jupiter top tokens
      console.log('⚠️ DexScreener returned no results, trying Jupiter...');
      return await this.scanViaJupiter(filters);
      
    } catch (error) {
      console.error('❌ Error in graduated token scanner:', error);
      return [];
    }
  }

  /**
   * Scan using DexScreener API (primary method)
   */
  private async scanViaDexScreener(filters: any): Promise<TokenSnapshot[]> {
    try {
      const response = await fetch(this.DEXSCREENER_API);
      
      if (!response.ok) {
        throw new Error(`DexScreener API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.pairs || !Array.isArray(data.pairs)) {
        console.warn('⚠️ Invalid response structure from DexScreener');
        return [];
      }
      
      console.log(`📊 DexScreener returned ${data.pairs.length} total pairs`);
      
      // Filter and transform Raydium pairs
      const raydiumPairs = data.pairs.filter((pair: DexScreenerPair) => 
        pair.dexId === 'raydium' && 
        pair.chainId === 'solana' &&
        pair.baseToken.address !== 'So11111111111111111111111111111111111111112' // Not SOL
      );
      
      console.log(`🌊 Found ${raydiumPairs.length} Raydium pairs`);
      
      // Convert to TokenSnapshot format
      const tokens: TokenSnapshot[] = raydiumPairs
        .map((pair: DexScreenerPair) => this.convertDexScreenerToSnapshot(pair))
        .filter(token => this.applyFilters(token, filters))
        .sort((a, b) => b.volume24h - a.volume24h)
        .slice(0, filters.limit || 100);
      
      console.log(`✅ Returning ${tokens.length} filtered Raydium tokens`);
      
      // Log top performers
      if (tokens.length > 0) {
        console.log('\n📈 Top Raydium Tokens:');
        tokens.slice(0, 5).forEach((token, i) => {
          console.log(
            `   ${i + 1}. ${token.symbol}: ` +
            `MC $${this.formatNumber(token.marketCap)}, ` +
            `Vol $${this.formatNumber(token.volume24h)}, ` +
            `Liq $${this.formatNumber(token.liquidity)}, ` +
            `${token.priceChange24h > 0 ? '+' : ''}${token.priceChange24h.toFixed(1)}%`
          );
        });
      }
      
      return tokens;
      
    } catch (error) {
      console.error('❌ DexScreener API error:', error);
      return [];
    }
  }

  /**
   * Fallback: Scan using Jupiter API
   */
  private async scanViaJupiter(filters: any): Promise<TokenSnapshot[]> {
    try {
      console.log('🪐 Using Jupiter API fallback...');
      
      // Get top tokens
      const topResponse = await fetch(this.JUPITER_TOP_TOKENS);
      const topTokens = await topResponse.json();
      
      if (!Array.isArray(topTokens)) {
        console.warn('⚠️ Invalid response from Jupiter top tokens');
        return [];
      }
      
      // Filter out SOL and get addresses
      const tokenAddresses = topTokens
        .filter((t: any) => t.address !== 'So11111111111111111111111111111111111111112')
        .slice(0, 50)
        .map((t: any) => t.address);
      
      if (tokenAddresses.length === 0) {
        return [];
      }
      
      // Get price data
      const priceResponse = await fetch(
        `${this.JUPITER_PRICE_API}?ids=${tokenAddresses.join(',')}`
      );
      const priceData = await priceResponse.json();
      
      if (!priceData.data) {
        console.warn('⚠️ No price data from Jupiter');
        return [];
      }
      
      // Convert to TokenSnapshot format
      const tokens: TokenSnapshot[] = [];
      
      for (const [address, data] of Object.entries(priceData.data)) {
        const tokenData = data as any;
        const topTokenInfo = topTokens.find((t: any) => t.address === address);
        
        tokens.push({
          mint: address,
          symbol: tokenData.symbol || topTokenInfo?.symbol || 'UNKNOWN',
          name: topTokenInfo?.name || tokenData.symbol || 'Unknown',
          price: tokenData.price || 0,
          marketCap: topTokenInfo?.marketCap || 0,
          volume24h: topTokenInfo?.volume24h || 0,
          liquidity: 0, // Jupiter doesn't provide liquidity
          holders: 0,
          priceChange24h: 0,
          graduated: true,
          source: 'raydium' as const,
          timestamp: Date.now()
        });
      }
      
      // Apply filters and sort
      const filtered = tokens
        .filter(token => this.applyFilters(token, filters))
        .sort((a, b) => b.marketCap - a.marketCap)
        .slice(0, filters.limit || 50);
      
      console.log(`✅ Found ${filtered.length} tokens via Jupiter`);
      return filtered;
      
    } catch (error) {
      console.error('❌ Jupiter API error:', error);
      return [];
    }
  }

  /**
   * Convert DexScreener pair to TokenSnapshot
   */
  private convertDexScreenerToSnapshot(pair: DexScreenerPair): TokenSnapshot {
    return {
      mint: pair.baseToken.address,
      symbol: pair.baseToken.symbol || 'UNKNOWN',
      name: pair.baseToken.name || pair.baseToken.symbol || 'Unknown',
      price: parseFloat(pair.priceUsd) || 0,
      marketCap: pair.fdv || pair.marketCap || 0,
      volume24h: pair.volume?.h24 || 0,
      liquidity: pair.liquidity?.usd || 0,
      holders: 0, // DexScreener doesn't provide holder count
      priceChange24h: pair.priceChange?.h24 || 0,
      graduated: true,
      source: 'raydium' as const,
      timestamp: Date.now(),
      // Additional useful fields
      pairAddress: pair.pairAddress,
      txns24h: pair.txns?.h24 || 0,
      volume6h: pair.volume?.h6 || 0,
      priceChange6h: pair.priceChange?.h6 || 0,
      priceChange1h: pair.priceChange?.h1 || 0
    };
  }

  /**
   * Apply filters to a token
   */
  private applyFilters(token: TokenSnapshot, filters: any): boolean {
    // Market cap filters
    if (filters.minMarketCap && token.marketCap < filters.minMarketCap) return false;
    if (filters.maxMarketCap && token.marketCap > filters.maxMarketCap) return false;
    
    // Volume filter
    const minVolume = filters.minVolume || this.MIN_VOLUME;
    if (token.volume24h < minVolume) return false;
    
    // Liquidity filter
    const minLiquidity = filters.minLiquidity || this.MIN_LIQUIDITY;
    if (token.liquidity < minLiquidity) return false;
    
    // Quality filters
    if (token.liquidity < 1000) return false; // Absolute minimum $1k liquidity
    if (token.txns24h && token.txns24h < 10) return false; // Min 10 transactions
    
    return true;
  }

  /**
   * Format number for display
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(0);
  }

  /**
   * Get tokens with specific characteristics
   */
  async findGems(options: {
    minVolToLiqRatio?: number;
    minPriceChange?: number;
    maxMarketCap?: number;
  } = {}): Promise<TokenSnapshot[]> {
    const tokens = await this.scanGraduated({
      maxMarketCap: options.maxMarketCap || 1000000, // Default $1M max
      minVolume: 5000,
      minLiquidity: 10000
    });
    
    return tokens.filter(token => {
      // Volume to liquidity ratio (high = lots of trading activity)
      const volToLiq = token.volume24h / (token.liquidity || 1);
      if (options.minVolToLiqRatio && volToLiq < options.minVolToLiqRatio) {
        return false;
      }
      
      // Price change filter
      if (options.minPriceChange && token.priceChange24h < options.minPriceChange) {
        return false;
      }
      
      return true;
    });
  }
}

// Export singleton instance
export const graduatedTokenScanner = new GraduatedTokenScanner();

// Direct function to replace empty scanGraduated()
export async function scanGraduated(filters: any = {}): Promise<TokenSnapshot[]> {
  return graduatedTokenScanner.scanGraduated(filters);
}