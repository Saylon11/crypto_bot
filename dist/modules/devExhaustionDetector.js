"use strict";
// src/modules/devExhaustionDetector.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDevExhaustion = detectDevExhaustion;
function detectDevExhaustion(devWallets, transactions, threshold // % threshold for exhaustion
) {
    if (threshold === void 0) { threshold = 10; }
    var totalInitial = 0;
    var totalRemaining = 0;
    devWallets.forEach(function (dev) {
        totalInitial += dev.initialBalance;
        var outgoing = transactions
            .filter(function (tx) { return tx.walletAddress === dev.address && tx.amount < 0; })
            .reduce(function (sum, tx) { return sum + Math.abs(tx.amount); }, 0);
        var remaining = Math.max(dev.initialBalance - outgoing, 0);
        totalRemaining += remaining;
    });
    var remainingPercentage = totalInitial === 0 ? 0 : (totalRemaining / totalInitial) * 100;
    return {
        exhausted: remainingPercentage <= threshold,
        remainingPercentage: parseFloat(remainingPercentage.toFixed(2)),
    };
}
