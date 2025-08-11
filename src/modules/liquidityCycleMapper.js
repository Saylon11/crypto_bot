"use strict";
// src/modules/liquidityCycleMapper.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapLiquidityCycles = mapLiquidityCycles;
var timeUtils_1 = require("./utils/timeUtils");
/**
 * Map liquidity flow into hourly activity buckets.
 * Identifies the most active times for trading.
 */
function mapLiquidityCycles(liquidityTimestamps) {
    console.log("Mapping liquidity cycles...");
    var hourlyActivity = {};
    liquidityTimestamps.forEach(function (timestamp) {
        var hour = (0, timeUtils_1.getUTCHourFromTimestamp)(timestamp);
        hourlyActivity["".concat(hour, ":00 UTC")] = (hourlyActivity["".concat(hour, ":00 UTC")] || 0) + 1;
    });
    return {
        peakHours: [],
        hourlyActivity: hourlyActivity,
    };
}
