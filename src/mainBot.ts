import fs from "fs";
// import path from "path";
import axios from "axios";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  monitorPumpFunTrades,
  executePumpFunSwap,
  fetchLiquidityPools,
} from "./qnAPI";
import type { PumpFunQuote, TradeData, CommandLineArgs, Config } from "./types"; // Import custom types

const CONFIG_FILE_PATH = "./config.json"; // Adjust the path if necessary

// Load environment variables
dotenv.config();
console.log("QuickNode RPC URL:", process.env.QUICKNODE_RPC_URL);
console.log("QuickNode WS URL:", process.env.QUICKNODE_WS_URL);
console.log("Metis Jupiter API URL:", process.env.METIS_JUPITER_API_URL);

/**
 * Reads configuration from a JSON file.
 * @returns Configuration object.
 */
function readConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const configData = fs.readFileSync(CONFIG_FILE_PATH, "utf-8");
      return JSON.parse(configData) as Config;
    } else {
      throw new Error(`Config file not found at ${CONFIG_FILE_PATH}`);
    }
  } catch (error) {
    console.error("🚨 Error reading configuration file:", error);
    process.exit(1); // Exit the application if the configuration is invalid
  }
}

/**
 * Determines if a token is a good sniping candidate based on configurable criteria.
 * @param tradeData Trade data for the token.
 * @returns True if the token meets sniping criteria, false otherwise.
 */
async function shouldSnipe(tradeData: TradeData): Promise<boolean> {
  const config = readConfig();
  const { mint, volume, price } = tradeData;

  // Implement your logic directly using QuickNode data here instead
  const volumeIncrease = volume > config.volumeThreshold;
  const priceSpike = price > config.priceThreshold;

  console.log(`🔍 Analyzing token ${mint}:`);
  console.log(`  Volume Increase: ${volumeIncrease}`);
  console.log(`  Price Spike: ${priceSpike}`);

  return volumeIncrease && priceSpike;
}

/**
 * Executes a trade flow by fetching a quote and processing the transaction.
 * @param inputMint The mint address of the input token.
 * @param outputMint The mint address of the output token.
 * @param amount The amount of the input token to swap (in smallest units).
 */
async function executeTradeFlow(
  inputMint: string,
  outputMint: string,
  amount: number,
) {
  const config = readConfig();

  // Safeguard: Maximum trade size
  if (amount > config.maxTradeSize) {
    console.log("⚠️ Trade size exceeds maximum limit. Skipping trade.");
    return;
  }

  try {
    console.log("🔍 Fetching Pump.fun swap quote...");
    const signature = await executePumpFunSwap(outputMint, "BUY", amount);
    console.log(
      "🎉 Pump.fun trade executed successfully. Signature:",
      signature,
    );
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Error:", error.message);
    } else {
      console.error("🚨 Unknown error:", error);
    }
  }
}

export async function getPumpFunQuote(
  mint: string,
  type: "BUY" | "SELL",
  amount: number,
  slippageBps: number = 50,
): Promise<PumpFunQuote> {
  try {
    const response = await axios.get(
      `${process.env.METIS_JUPITER_API_URL}/pump-fun/quote`,
      {
        params: { mint, type, amount, slippageBps },
      },
    );
    console.log("✅ Pump.fun quote fetched successfully:", response.data);
    return response.data as PumpFunQuote;
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Error:", error.message);
    } else {
      console.error("🚨 Unknown error:", error);
    }
    throw error;
  }
}

/**
 * Main function to run the bot in a structured sequence.
 */
async function main() {
  const argv: CommandLineArgs = (await yargs(hideBin(process.argv))
    .option("inputMint", { type: "string" })
    .option("outputMint", { type: "string" })
    .option("amount", { type: "number" })
    .option("slippage", { type: "number" })
    .option("test", { type: "boolean" })
    .help().argv) as CommandLineArgs;

  if (argv.test) {
    console.log("🧪 Running in test mode...");
    return;
  }

  const config = readConfig() as Config;
  const inputMint = argv.inputMint || config.tokenAddress;
  const outputMint = argv.outputMint || config.mint;
  const amount = argv.amount || config.amount;
  const slippage = argv.slippage || config.slippage;

  if (!inputMint || !outputMint || !amount || !slippage) {
    console.error(
      "🚨 Missing required parameters. Provide them via CLI or config file.",
    );
    process.exit(1);
  }

  console.log("🚀 Starting WebSocket listener for Pump.fun trades...");
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
      console.log("🔍 Detected trade data:", data);

      if (await shouldSnipe(data)) {
        console.log(`🎯 Sniping opportunity detected for ${data.mint}`);
        await executeTradeFlow(inputMint, data.mint, amount);

        // Safeguard: Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1-second delay
      }
    }
  });
}

main();

(async () => {
  try {
    console.log("🚀 Starting bot...");
    const config = readConfig(); // Read configuration values

    console.log("🔍 Fetching liquidity pools...");
    const pools = await fetchLiquidityPools(config.tokenAddress);
    console.log("✅ Liquidity pools fetched:", pools);

    console.log("🔍 Executing Pump.fun trade...");
    await getPumpFunQuote(
      config.mint,
      config.tradeType as "BUY" | "SELL",
      config.amount,
    ); // Explicitly cast tradeType
    const signature = await executePumpFunSwap(
      config.mint,
      config.tradeType as "BUY" | "SELL", // Explicitly cast tradeType
      config.amount,
    );
    console.log("✅ Trade executed successfully. Signature:", signature);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("🚨 Critical error in bot execution:", error.message);
    } else {
      console.error("🚨 Unknown critical error in bot execution:", error);
    }
    process.exit(1); // Exit the application on critical errors
  }
})();

// Example usage of getPumpFunQuote
(async () => {
  try {
    const mint = "So11111111111111111111111111111111111111112";
    const type = "BUY";
    const amount = 1000000;

    console.log("🔍 Fetching Pump.fun quote...");
    const quote = await getPumpFunQuote(mint, type, amount);
    console.log("✅ Pump.fun quote fetched successfully:", quote);
  } catch (error) {
    console.error("🚨 Error:", error);
  }
})();
