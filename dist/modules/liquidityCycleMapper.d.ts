import { LiquidityHotZones } from "../types";
/**
 * Map liquidity flow into hourly activity buckets.
 * Identifies the most active times for trading.
 */
export declare function mapLiquidityCycles(liquidityTimestamps: number[]): LiquidityHotZones;
