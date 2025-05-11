// src/modules/liquidityCycleMapper.ts

import { LiquidityHotZones } from "../types";
import { getUTCHourFromTimestamp } from "../utils/timeUtils";

/**
 * Map liquidity flow into hourly activity buckets.
 * Identifies the most active times for trading.
 */

export function mapLiquidityCycles(liquidityTimestamps: number[]): LiquidityHotZones {
  console.log("Mapping liquidity cycles...");

  const hourlyActivity: { [hour: string]: number } = {};

  liquidityTimestamps.forEach(timestamp => {
    const hour = getUTCHourFromTimestamp(timestamp);
    hourlyActivity[`${hour}:00 UTC`] = (hourlyActivity[`${hour}:00 UTC`] || 0) + 1;
  });

  return {
    hourlyActivity,
  };
}