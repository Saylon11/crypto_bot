import type { GmgnSwapRoute, MarketSentiment, TokenAnalysis } from "./types.js";

export async function getMarketSentiment(
  tokenAddress: string,
): Promise<MarketSentiment> {
  const response = await fetch(
    `https://api.gmgn.ai/market-sentiment/${tokenAddress}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GMGN_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch sentiment: ${response.statusText}`);
  }

  const sentiment: MarketSentiment = await response.json();
  return sentiment;
}

export async function findOptimalSwapRoute(
  inputToken: string,
  outputToken: string,
  amount: number,
): Promise<GmgnSwapRoute> {
  const response = await fetch(
    `https://api.gmgn.ai/swap-route?input=${inputToken}&output=${outputToken}&amount=${amount}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GMGN_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch swap route: ${response.statusText}`);
  }

  const route: GmgnSwapRoute = await response.json();
  return route;
}

export async function performLiquidityAnalysis(
  tokenAddress: string,
): Promise<TokenAnalysis> {
  const response = await fetch(
    `https://api.gmgn.ai/liquidity-analysis/${tokenAddress}`,
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GMGN_API_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Liquidity analysis fetch failed: ${response.statusText}`);
  }

  const analysis: TokenAnalysis = await response.json();
  return analysis;
}
