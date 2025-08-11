"use strict";
// src/modules/walletProfiler.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.profileWallets = profileWallets;
function profileWallets(wallets) {
    console.log("Profiling wallets...");
    var shrimpThreshold = 500;
    var dolphinThreshold = 5000;
    var shrimps = [];
    var dolphins = [];
    var whales = [];
    wallets.forEach(function (w) {
        var address = w.walletAddress || w.address || 'unknown';
        if (w.amount <= shrimpThreshold) {
            shrimps.push(address);
        }
        else if (w.amount <= dolphinThreshold) {
            dolphins.push(address);
        }
        else {
            whales.push(address);
        }
    });
    var total = wallets.length || 1;
    return {
        shrimps: shrimps,
        dolphins: dolphins,
        whales: whales,
        totalWallets: total,
        distribution: {
            shrimpPercentage: (shrimps.length / total) * 100,
            dolphinPercentage: (dolphins.length / total) * 100,
            whalePercentage: (whales.length / total) * 100
        }
    };
}
