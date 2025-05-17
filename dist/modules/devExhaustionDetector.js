"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDevExhaustion = detectDevExhaustion;
function detectDevExhaustion(devWallets, transactions, threshold = 10 // % threshold for exhaustion
) {
    let totalInitial = 0;
    let totalRemaining = 0;
    devWallets.forEach((dev) => {
        totalInitial += dev.initialBalance;
        const outgoing = transactions
            .filter((tx) => tx.walletAddress === dev.address && tx.amount < 0)
            .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const remaining = Math.max(dev.initialBalance - outgoing, 0);
        totalRemaining += remaining;
    });
    const remainingPercentage = totalInitial === 0 ? 0 : (totalRemaining / totalInitial) * 100;
    return {
        exhausted: remainingPercentage <= threshold,
        remainingPercentage: parseFloat(remainingPercentage.toFixed(2)),
    };
}
//# sourceMappingURL=devExhaustionDetector.js.map