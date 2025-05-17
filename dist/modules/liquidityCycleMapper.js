"use strict";
// src/modules/liquidityCycleMapper.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLiquidityCycles = mapLiquidityCycles;
const timeUtils_1 = require("../utils/timeUtils");
/**
 * Map liquidity flow into hourly activity buckets.
 * Identifies the most active times for trading.
 */
function mapLiquidityCycles(liquidityTimestamps) {
    console.log("Mapping liquidity cycles...");
    const hourlyActivity = {};
    liquidityTimestamps.forEach(timestamp => {
        const hour = (0, timeUtils_1.getUTCHourFromTimestamp)(timestamp);
        hourlyActivity[`${hour}:00 UTC`] = (hourlyActivity[`${hour}:00 UTC`] || 0) + 1;
    });
    return {
        hourlyActivity,
    };
}
//# sourceMappingURL=liquidityCycleMapper.js.map