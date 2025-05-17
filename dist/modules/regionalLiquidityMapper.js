"use strict";
// src/modules/regionalLiquidityMapper.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapRegionalLiquidity = mapRegionalLiquidity;
/**
 * Map liquidity activity by region based on UTC time assumptions.
 * Rough heuristic based on time of trade (optional: expand with IP data in future).
 */
function mapRegionalLiquidity(liquidityTimestamps) {
    console.log("Mapping regional liquidity...");
    const regionActivity = {
        "Asia (UTC+8 to UTC+10)": 0,
        "Europe (UTC+0 to UTC+3)": 0,
        "US (UTC-5 to UTC-8)": 0,
        "Other": 0,
    };
    liquidityTimestamps.forEach(timestamp => {
        const utcHour = new Date(timestamp * 1000).getUTCHours();
        if (utcHour >= 0 && utcHour <= 3) {
            regionActivity["Europe (UTC+0 to UTC+3)"]++;
        }
        else if (utcHour >= 8 && utcHour <= 13) {
            regionActivity["Asia (UTC+8 to UTC+10)"]++;
        }
        else if (utcHour >= 14 && utcHour <= 20) {
            regionActivity["US (UTC-5 to UTC-8)"]++;
        }
        else {
            regionActivity["Other"]++;
        }
    });
    return {
        regionActivity,
    };
}
//# sourceMappingURL=regionalLiquidityMapper.js.map