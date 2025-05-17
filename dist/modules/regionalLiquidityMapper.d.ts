import { RegionalLiquidityReport } from "../types";
/**
 * Map liquidity activity by region based on UTC time assumptions.
 * Rough heuristic based on time of trade (optional: expand with IP data in future).
 */
export declare function mapRegionalLiquidity(liquidityTimestamps: number[]): RegionalLiquidityReport;
