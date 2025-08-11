"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPanicSelling = detectPanicSelling;
/**
 * Detects panic sell behavior in wallets (esp. shrimp wallets) exiting at near break-even levels.
 */
function detectPanicSelling(walletData) {
    var totalExits = 0;
    var likelyPanicExits = 0;
    walletData.forEach(function (tx) {
        var _a;
        if (tx.amount < 0) {
            totalExits++;
            var nearBreakEven = Math.abs(tx.priceChangePercent || 0) < 5; // +/-5% = break-even
            var isShrimp = ((_a = tx.totalBalance) !== null && _a !== void 0 ? _a : 0) < 5000; // Assume shrimp holds < 5k tokens
            if (nearBreakEven && isShrimp) {
                likelyPanicExits++;
            }
        }
    });
    var panicScore = totalExits === 0 ? 0 : Math.round((likelyPanicExits / totalExits) * 100);
    return {
        panicScore: panicScore,
        likelyShrimpExits: likelyPanicExits,
        totalExits: totalExits,
        comment: panicScore > 70
            ? "⚠️ High panic behavior detected — likely emotional liquidity exit"
            : panicScore > 40
                ? "Moderate panic exit trend forming"
                : "Low panic activity",
    };
}
