// HootBot/src/scanners/gemScanner.ts
import { Connection, PublicKey } from '@solana/web3.js';
import fetch from 'node-fetch';

export interface TokenSnapshot {
  mint: string;
  symbol?: string;
  name?: string;
  marketCap: number;
  volume24h: number;
  priceChange24h: number;
  holders: number;
  isGraduated: boolean; // Graduated from pump.fun to Raydium
  createdAt: number;
  lastTradeAt: number;
  liquidityUSD?: number;
  devHoldings?: number;
}

export interface ScanFilters {
  minMarketCap?: number;
  maxMarketCap?: number;
  minVolume24h?: number;
  minHolders?: number;
  maxAge?: number; // Max age in milliseconds
  includeGraduated?: boolean;
  includePumpFun?: boolean;
}

/**
 * Scans for potential gem tokens across Solana ecosystem
 */
export class GemScanner {
  private connection: Connection;
  private cache: Map<string, { data: TokenSnapshot; timestamp: number }> = new Map();
  private cacheExpiry: number = 60000; // 1 minute cache
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  /**
   * Scan for gems based on filters
   */
  async scan(filters?: ScanFilters): Promise<TokenSnapshot[]> {
    const defaultFilters: ScanFilters = {
      minMarketCap: 10000,      // $10k minimum
      maxMarketCap: 10000000,   // $10M maximum
      minVolume24h: 1000,       // $1k daily volume
      minHolders: 50,           // At least 50 holders
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days old max
      includeGraduated: true,
      includePumpFun: true,
      ...filters
    };
    
    console.log('🔍 Scanning with filters:', {
      marketCap: `$${(defaultFilters.minMarketCap! / 1000).toFixed(0)}k - $${(defaultFilters.maxMarketCap! / 1000000).toFixed(1)}M`,
      volume: `$${(defaultFilters.minVolume24h! / 1000).toFixed(0)}k+`,
      holders: `${defaultFilters.minHolders}+`
    });
    
    const gems: TokenSnapshot[] = [];
    
    // Scan pump.fun tokens
    if (defaultFilters.includePumpFun) {
      const pumpTokens = await this.scanPumpFun(defaultFilters);
      gems.push(...pumpTokens);
    }
    
    // Scan graduated tokens (Raydium)
    if (defaultFilters.includeGraduated) {
      const graduatedTokens = await this.scanGraduated(defaultFilters);
      gems.push(...graduatedTokens);
    }
    
    // Sort by emotional liquidity indicators
    gems.sort((a, b) => {
      // Prioritize by volume/mcap ratio (liquidity indicator)
      const ratioA = a.volume24h / a.marketCap;
      const ratioB = b.volume24h / b.marketCap;
      return ratioB - ratioA;
    });
    
    console.log(`✅ Found ${gems.length} potential gems`);
    
    return gems;
  }
  
  /**
   * Scan pump.fun for new tokens
   */
  private async scanPumpFun(filters: ScanFilters): Promise<TokenSnapshot[]> {
    try {
      console.log('🎲 Scanning pump.fun tokens...');
      
      // Get trending tokens from pump.fun
      const response = await fetch('https://frontend-api.pump.fun/coins?offset=0&limit=50&sort=created&order=desc');
      
      if (!response.ok) {
        console.error('Failed to fetch pump.fun data');
        return [];
      }
      
      const data = await response.json();
      const tokens: TokenSnapshot[] = [];
      
      for (const coin of data) {
        // Skip if graduated (we'll get these from Raydium scan)
        if (coin.complete) continue;
        
        // Apply filters
        if (coin.usd_market_cap < filters.minMarketCap!) continue;
        if (coin.usd_market_cap > filters.maxMarketCap!) continue;
        
        // Check age
        const age = Date.now() - new Date(coin.created_timestamp).getTime();
        if (age > filters.maxAge!) continue;
        
        tokens.push({
          mint: coin.mint,
          symbol: coin.symbol,
          name: coin.name,
          marketCap: coin.usd_market_cap,
          volume24h: coin.volume || 0,
          priceChange24h: 0, // Not available from this API
          holders: coin.holder_count || 0,
          isGraduated: false,
          createdAt: new Date(coin.created_timestamp).getTime(),
          lastTradeAt: Date.now(),
          devHoldings: this.calculateDevHoldings(coin)
        });
      }
      
      console.log(`   Found ${tokens.length} pump.fun tokens`);
      return tokens;
      
    } catch (error) {
      console.error('Error scanning pump.fun:', error);
      return [];
    }
  }
  
  /**
   * Scan graduated tokens on Raydium
   */
  private async scanGraduated(filters: ScanFilters): Promise<TokenSnapshot[]> {
    try {
      console.log('🌊 Scanning Raydium tokens...');
      
      // In production, this would query Raydium API or on-chain data
      // For now, we'll use a placeholder
      // TODO: Implement actual Raydium scanning
      
      return [];
      
    } catch (error) {
      console.error('Error scanning Raydium:', error);
      return [];
    }
  }
  
  /**
   * Calculate dev holdings percentage
   */
  private calculateDevHoldings(coin: any): number {
    // Simple calculation based on pump.fun data
    if (coin.total_supply && coin.remaining_supply) {
      const burned = coin.total_supply - coin.remaining_supply;
      return (burned / coin.total_supply) * 100;
    }
    return 0;
  }
  
  /**
   * Get detailed token info
   */
  async getTokenDetails(mint: string): Promise<TokenSnapshot | null> {
    // Check cache
    const cached = this.cache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    try {
      // Try pump.fun first
      const pumpResponse = await fetch(`https://frontend-api.pump.fun/coins/${mint}`);
      if (pumpResponse.ok) {
        const data = await pumpResponse.json();
        const token: TokenSnapshot = {
          mint,
          symbol: data.symbol,
          name: data.name,
          marketCap: data.usd_market_cap,
          volume24h: data.volume || 0,
          priceChange24h: 0,
          holders: data.holder_count || 0,
          isGraduated: data.complete || false,
          createdAt: new Date(data.created_timestamp).getTime(),
          lastTradeAt: Date.now()
        };
        
        // Cache it
        this.cache.set(mint, { data: token, timestamp: Date.now() });
        return token;
      }
      
      // If not on pump.fun, check other sources
      // TODO: Add Raydium/Jupiter price API checks
      
      return null;
      
    } catch (error) {
      console.error(`Error fetching details for ${mint}:`, error);
      return null;
    }
  }
}

/**
 * Singleton scanner instance
 */
let scannerInstance: GemScanner | null = null;

/**
 * Get or create scanner instance
 */
export function getScanner(connection: Connection): GemScanner {
  if (!scannerInstance) {
    scannerInstance = new GemScanner(connection);
  }
  return scannerInstance;
}

/**
 * Main scan function for easy access
 */
export async function scanForGems(filters?: ScanFilters): Promise<TokenSnapshot[]> {
  const rpcUrl = process.env.HELIUS_RPC_URL || 
                (process.env.HELIUS_API_KEY 
                  ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
                  : 'https://api.mainnet-beta.solana.com');
  
  const connection = new Connection(rpcUrl, 'confirmed');
  const scanner = getScanner(connection);
  
  return scanner.scan(filters);
}