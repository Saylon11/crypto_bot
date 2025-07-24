"use strict";
// src/modules/herdSentimentAnalyzer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeHerdSentiment = analyzeHerdSentiment;
var mathUtils_1 = require("../utils/mathUtils");
var timeUtils_1 = require("../utils/timeUtils");
function analyzeHerdSentiment(wallets) {
    console.log("Analyzing herd sentiment...");
    var smallWalletThreshold = 500; // SOL or USD equivalent for "shrimp"
    var smallWalletBuys = wallets.filter(function (wallet) { return wallet.amount <= smallWalletThreshold; });
    var buyTimestamps = smallWalletBuys.map(function (wallet) { return wallet.timestamp; });
    var buyAmounts = smallWalletBuys.map(function (wallet) { return wallet.amount; });
    var netBuys = wallets.filter(function (w) { return w.type === "buy"; }).length;
    var netSells = wallets.filter(function (w) { return w.type === "sell"; }).length;
    var netSentiment = Number(netBuys - netSells);
    var averageBuyAmount = buyAmounts.length ? (0, mathUtils_1.calculateAverage)(buyAmounts) : 0;
    var volatility = buyAmounts.length ? (0, mathUtils_1.calculateStandardDeviation)(buyAmounts) : 0;
    var hourlyBuckets = {};
    buyTimestamps.forEach(function (timestamp) {
        var hour = (0, timeUtils_1.getUTCHourFromTimestamp)(timestamp);
        hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
    });
    var activeHours = Object.entries(hourlyBuckets)
        .sort(function (a, b) { return b[1] - a[1]; })
        .map(function (_a) {
        var hour = _a[0];
        return "".concat(hour, ":00 UTC");
    });
    return {
        netSentiment: netSentiment,
        smallWalletBuyCount: smallWalletBuys.length,
        averageBuyAmount: averageBuyAmount,
        volatility: volatility,
        activeHours: activeHours,
    };
}
