"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPanicSelling = detectPanicSelling;
/**
 * Detects panic sell behavior in wallets (esp. shrimp wallets) exiting at near break-even levels.
 */
function detectPanicSelling(walletData) {
    let totalExits = 0;
    let likelyPanicExits = 0;
    walletData.forEach((tx) => {
        if (tx.amount < 0) {
            totalExits++;
            const nearBreakEven = Math.abs(tx.priceChangePercent || 0) < 5; // +/-5% = break-even
            const isShrimp = (tx.totalBalance ?? 0) < 5000; // Assume shrimp holds < 5k tokens
            if (nearBreakEven && isShrimp) {
                likelyPanicExits++;
            }
        }
    });
    const panicScore = totalExits === 0 ? 0 : Math.round((likelyPanicExits / totalExits) * 100);
    return {
        panicScore,
        likelyShrimpExits: likelyPanicExits,
        totalExits,
        comment: panicScore > 70
            ? "⚠️ High panic behavior detected — likely emotional liquidity exit"
            : panicScore > 40
                ? "Moderate panic exit trend forming"
                : "Low panic activity",
    };
}
//# sourceMappingURL=panicSellDetector.js.map