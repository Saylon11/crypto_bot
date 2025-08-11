"use strict";
// src/modules/consumerProfileAnalyzer.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeConsumerProfiles = analyzeConsumerProfiles;
/**
 * Analyze active wallets to classify consumer profiles (Shrimp, Dolphin, Whale).
 */
function analyzeConsumerProfiles(wallets) {
    console.log("Analyzing consumer profiles...");
    var shrimpThreshold = 500;
    var dolphinThreshold = 5000;
    var shrimpCount = 0;
    var dolphinCount = 0;
    var whaleCount = 0;
    wallets.forEach(function (wallet) {
        if (wallet.amount <= shrimpThreshold) {
            shrimpCount++;
        }
        else if (wallet.amount <= dolphinThreshold) {
            dolphinCount++;
        }
        else {
            whaleCount++;
        }
    });
    var total = shrimpCount + dolphinCount + whaleCount || 1; // Prevent divide by 0
    return {
        shrimpPercent: (shrimpCount / total) * 100,
        dolphinPercent: (dolphinCount / total) * 100,
        whalePercent: (whaleCount / total) * 100,
    };
}
