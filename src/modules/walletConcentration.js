"use strict";
// src/modules/walletConcentration.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeWalletConcentration = analyzeWalletConcentration;
/**
 * Estimate wallet concentration depth from Helius transfers.
 * Returns a number indicating the concentration target (e.g., 5, 10, or 20 for top 5%, 10%, 20%).
 */
function analyzeWalletConcentration(transfers) {
    var walletSums = {};
    for (var _i = 0, transfers_1 = transfers; _i < transfers_1.length; _i++) {
        var tx = transfers_1[_i];
        var to = tx.toUserAccount || "unknown";
        var amount = tx.amount;
        if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
            continue;
        }
        if (!walletSums[to]) {
            walletSums[to] = 0;
        }
        walletSums[to] += amount;
    }
    var sortedHolders = Object.values(walletSums).sort(function (a, b) { return b - a; });
    if (sortedHolders.length === 0) {
        return 20;
    }
    var totalHeld = sortedHolders.reduce(function (a, b) { return a + b; }, 0);
    if (totalHeld === 0) {
        return 20;
    }
    var top5 = sortedHolders.slice(0, Math.min(5, sortedHolders.length)).reduce(function (a, b) { return a + b; }, 0);
    var top10 = sortedHolders.slice(0, Math.min(10, sortedHolders.length)).reduce(function (a, b) { return a + b; }, 0);
    var top20 = sortedHolders.slice(0, Math.min(20, sortedHolders.length)).reduce(function (a, b) { return a + b; }, 0);
    var concentration5 = (top5 / totalHeld) * 100;
    var concentration10 = (top10 / totalHeld) * 100;
    var concentration20 = (top20 / totalHeld) * 100;
    if (concentration5 > 80)
        return 5;
    if (concentration10 > 40)
        return 10;
    return 20;
}
