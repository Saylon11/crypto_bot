import { WalletData } from "../types";

interface SnapshotInput {
  token: string;
  timestamp: number;
  whales: number;
  dolphins: number;
  shrimps: number;
  survivability: number;
  panicScore: number;
  devExhaustion: number;
  marketFlow: number;
  region: string;
  peakHour: string;
  action: string;
}

export function generateSnapshot(input: SnapshotInput): void {
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

function panicLabel(score: number): string {
  if (score >= 70) return "⚠️ High panic exits";
  if (score >= 40) return "Moderate exit behavior";
  return "Low panic activity";
}

function regionFlag(code: string): string {
  const flags: Record<string, string> = {
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