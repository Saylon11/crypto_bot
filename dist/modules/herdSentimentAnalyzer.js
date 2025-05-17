"use strict";
// src/modules/herdSentimentAnalyzer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeHerdSentiment = analyzeHerdSentiment;
const mathUtils_1 = require("../utils/mathUtils");
const timeUtils_1 = require("../utils/timeUtils");
function analyzeHerdSentiment(wallets) {
    console.log("Analyzing herd sentiment...");
    const smallWalletThreshold = 500; // SOL or USD equivalent for "shrimp"
    const smallWalletBuys = wallets.filter(wallet => wallet.amount <= smallWalletThreshold);
    const buyTimestamps = smallWalletBuys.map(wallet => wallet.timestamp);
    const buyAmounts = smallWalletBuys.map(wallet => wallet.amount);
    const netBuys = wallets.filter(w => w.type === "buy").length;
    const netSells = wallets.filter(w => w.type === "sell").length;
    const netSentiment = Number(netBuys - netSells);
    const averageBuyAmount = buyAmounts.length ? (0, mathUtils_1.calculateAverage)(buyAmounts) : 0;
    const volatility = buyAmounts.length ? (0, mathUtils_1.calculateStandardDeviation)(buyAmounts) : 0;
    const hourlyBuckets = {};
    buyTimestamps.forEach(timestamp => {
        const hour = (0, timeUtils_1.getUTCHourFromTimestamp)(timestamp);
        hourlyBuckets[hour] = (hourlyBuckets[hour] || 0) + 1;
    });
    const activeHours = Object.entries(hourlyBuckets)
        .sort((a, b) => b[1] - a[1])
        .map(([hour]) => `${hour}:00 UTC`);
    return {
        netSentiment,
        smallWalletBuyCount: smallWalletBuys.length,
        averageBuyAmount,
        volatility,
        activeHours,
    };
}
//# sourceMappingURL=herdSentimentAnalyzer.js.map