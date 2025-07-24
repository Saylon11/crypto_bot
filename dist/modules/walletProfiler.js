"use strict";
// src/modules/walletProfiler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileWallets = profileWallets;
/**
 * Profile wallets into Shrimp, Dolphin, Whale categories based on buy amount.
 */
function profileWallets(wallets) {
    console.log("Profiling wallets...");
    var shrimpThreshold = 500;
    var dolphinThreshold = 5000;
    var shrimps = wallets.filter(function (w) { return w.amount <= shrimpThreshold; });
    var dolphins = wallets.filter(function (w) { return w.amount > shrimpThreshold && w.amount <= dolphinThreshold; });
    var whales = wallets.filter(function (w) { return w.amount > dolphinThreshold; });
    var total = wallets.length || 1; // Prevent divide by 0
    return {
        shrimps: shrimps,
        dolphins: dolphins,
        whales: whales,
        shrimpPercent: (shrimps.length / total) * 100,
        dolphinPercent: (dolphins.length / total) * 100,
        whalePercent: (whales.length / total) * 100
    };
}
