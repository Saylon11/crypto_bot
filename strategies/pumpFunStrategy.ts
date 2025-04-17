import { monitorPumpFunTrades } from "../src/qnAPI.js";
import { shouldSnipe, executeTradeFlow } from "../src/mainBot.js";
import { getMarketSentiment } from "../src/gmgnAPI.js";
import { analyzeSocialSentiment } from "../src/xai.js";
import { generativeTradeDecision } from "../src/chat-gpt.js";
import type {
  TradeData,
  MarketSentiment,
  AISentimentAnalysis,
} from "../src/types.js";

export async function pumpFunStrategy(
  inputMint: string,
  amount: number,
): Promise<void> {
  console.log("🚀 Running Pump.fun AI-driven sniping strategy...");

  monitorPumpFunTrades(async (tradeData: Record<string, unknown>) => {
    if (
      typeof tradeData.mint === "string" &&
      typeof tradeData.volume === "number" &&
      typeof tradeData.price === "number"
    ) {
      const data: TradeData = {
        mint: tradeData.mint,
        volume: tradeData.volume,
        price: tradeData.price,
      };

      console.log("🔍 Detected PumpFun trade data:", data);

      const xSentiment: MarketSentiment = await getMarketSentiment(data.mint);
      console.log(
        "📡 Immediate X.com sentiment fetched via GMGN.ai:",
        xSentiment,
      );

      const aiSentiment: AISentimentAnalysis = await analyzeSocialSentiment(
        data.mint,
      );
      console.log(
        "🧠 Comprehensive AI-driven sentiment analysis:",
        aiSentiment,
      );

      const decision = await generativeTradeDecision(
        data,
        xSentiment,
        aiSentiment,
      );
      console.log("🤖 Generative AI trade decision:", decision);

      if (decision.shouldExecuteTrade) {
        console.log(
          `🎯 AI-driven sniping opportunity explicitly confirmed for ${data.mint}`,
        );
        await executeTradeFlow(inputMint, data.mint, amount);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } else {
        console.log(`⚠️ AI-driven decision skipped trade for ${data.mint}`);
      }
    }
  });
}
