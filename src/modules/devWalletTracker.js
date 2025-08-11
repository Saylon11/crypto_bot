"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackDevWallets = trackDevWallets;
/**
 * Track developer wallet activity
 * Part of the risk assessment system
 */
function trackDevWallets(devWallets) {
    var totalRisk = 0;
    var recentMovements = 0;
    var riskFactors = [];
    for (var _i = 0, devWallets_1 = devWallets; _i < devWallets_1.length; _i++) {
        var wallet = devWallets_1[_i];
        var balanceChange = wallet.initialBalance - wallet.currentBalance;
        var percentChange = (balanceChange / wallet.initialBalance) * 100;
        // Check for significant movements
        if (percentChange > 20) {
            totalRisk += 30;
            riskFactors.push("".concat(wallet.label, " moved ").concat(percentChange.toFixed(1), "% of holdings"));
            recentMovements++;
        }
        // Check for recent activity
        var hoursSinceActivity = (Date.now() - wallet.lastActivity) / (1000 * 60 * 60);
        if (hoursSinceActivity < 24) {
            totalRisk += 10;
            recentMovements++;
        }
    }
    // Determine activity level
    var devActivity;
    if (recentMovements >= 3) {
        devActivity = 'HIGH';
    }
    else if (recentMovements >= 1) {
        devActivity = 'MEDIUM';
    }
    else if (totalRisk > 0) {
        devActivity = 'LOW';
    }
    else {
        devActivity = 'NONE';
    }
    return {
        totalRisk: Math.min(100, totalRisk),
        devActivity: devActivity,
        recentMovements: recentMovements,
        riskFactors: riskFactors
    };
}
