"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSnapshot = generateSnapshot;
function generateSnapshot(input) {
    console.log(`\n❤️ Emotional Liquidity Snapshot: ${input.token}\n`);
    console.log(`🐋 Whales: ${input.whales}   🐬 Dolphins: ${input.dolphins}   🦐 Shrimps: ${input.shrimps}`);
    console.log(`🌱 Survivability Score: ${input.survivability}%`);
    console.log(`😱 Panic Score: ${input.panicScore}%   → ${panicLabel(input.panicScore)}`);
    console.log(`😅 Dev Exhaustion: ${input.devExhaustion}% of dev tokens sold`);
    console.log(`💸 Flow: Net Inflow  ${input.marketFlow > 0 ? "+" : ""}${input.marketFlow.toFixed(2)}%`);
    console.log(`🕒 Peak Hour: ${input.peakHour}`);
    console.log(`🌍 Region: ${regionFlag(input.region)} ${input.region}`);
    console.log(`🚀 Suggested Action: ${input.action}\n`);
}
function panicLabel(score) {
    if (score >= 70)
        return "⚠️ High panic exits";
    if (score >= 40)
        return "Moderate exit behavior";
    return "Low panic activity";
}
function regionFlag(code) {
    const flags = {
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
//# sourceMappingURL=snapshotGenerator.js.map