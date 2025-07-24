"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSnapshot = generateSnapshot;
function generateSnapshot(input) {
    console.log("\n\u2764\uFE0F Emotional Liquidity Snapshot: ".concat(input.token, "\n"));
    console.log("\uD83D\uDC0B Whales: ".concat(input.whales, "   \uD83D\uDC2C Dolphins: ").concat(input.dolphins, "   \uD83E\uDD90 Shrimps: ").concat(input.shrimps));
    console.log("\uD83C\uDF31 Survivability Score: ".concat(input.survivability, "%"));
    console.log("\uD83D\uDE31 Panic Score: ".concat(input.panicScore, "%   \u2192 ").concat(panicLabel(input.panicScore)));
    console.log("\uD83D\uDE05 Dev Exhaustion: ".concat(input.devExhaustion, "% of dev tokens sold"));
    console.log("\uD83D\uDCB8 Flow: Net Inflow  ".concat(input.marketFlow > 0 ? "+" : "").concat(input.marketFlow.toFixed(2), "%"));
    console.log("\uD83D\uDD52 Peak Hour: ".concat(input.peakHour));
    console.log("\uD83C\uDF0D Region: ".concat(regionFlag(input.region), " ").concat(input.region));
    console.log("\uD83D\uDE80 Suggested Action: ".concat(input.action, "\n"));
}
function panicLabel(score) {
    if (score >= 70)
        return "⚠️ High panic exits";
    if (score >= 40)
        return "Moderate exit behavior";
    return "Low panic activity";
}
function regionFlag(code) {
    var flags = {
        US: "🇺🇸",
        JP: "🇯🇵",
        DE: "🇩🇪",
        BR: "🇧🇷",
        IN: "🇮🇳",
        KR: "🇰🇷",
        GB: "🇬🇧",
        CA: "🇨🇦",
        CN: "🇨🇳",
        SG: "🇸🇬",
        RU: "🇷🇺",
        TR: "🇹🇷",
        VN: "🇻🇳",
        NG: "🇳🇬",
        FR: "🇫🇷",
        TH: "🇹🇭",
        ID: "🇮🇩",
        ES: "🇪🇸",
        AU: "🇦🇺"
    };
    return flags[code.toUpperCase()] || "🌍";
}
