import fs from "fs";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { executePumpFunSwap, getLiquidityPools } from "./qnAPI.js";
import type {
  TradeData,
  CommandLineArgs,
  Config,
  LiquidityPool,
} from "./types.js"; // Import custom types
import { pumpFunStrategy } from "../strategies/pumpFunStrategy.js";
import { longTermStrategy } from "../strategies/longTermStrategy.js";

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
export async function shouldSnipe(tradeData: TradeData): Promise<boolean> {
  const config = readConfig();
  const { mint, volume, price } = tradeData;

  const liquidityPools = await getLiquidityPools();
  const tokenLiquidity = liquidityPools.reduce(
    (total: number, pool: LiquidityPool) => total + pool.liquidity,
    0,
  );

  const volumeIncrease = volume > config.volumeThreshold;
  const priceSpike = price > config.priceThreshold;
  const sufficientLiquidity = tokenLiquidity > config.minimumLiquidity;

  console.log(`🔍 Analyzing token ${mint}:`);
  console.log(`  Volume Increase: ${volumeIncrease}`);
  console.log(`  Price Spike: ${priceSpike}`);
  console.log(
    `  Sufficient Liquidity: ${sufficientLiquidity} (Liquidity: ${tokenLiquidity}, Min: ${config.minimumLiquidity})`,
  );

  return volumeIncrease && priceSpike && sufficientLiquidity;
}

// These variables are planned for use with executeTradeFlow and logTradeStatistics in future phases.
let totalTrades: number = 0;
let successfulTrades: number = 0;
let totalExecutionTime: number = 0;

/**
 * Executes a trade flow for a given input and output mint.
 * @param inputMint The input token mint address.
 * @param outputMint The output token mint address.
 * @param amount The amount to trade.
 */
export async function executeTradeFlow(
  inputMint: string,
  outputMint: string,
  amount: number,
): Promise<void> {
  const config = readConfig();

  if (amount > config.maxTradeSize) {
    console.log("⚠️ Trade size exceeds maximum limit. Skipping trade.");
    return;
  }

  const startTime = Date.now();

  try {
    console.log("🔍 Fetching Pump.fun swap quote...");
    const signature = await executePumpFunSwap(outputMint, "BUY", amount);
    console.log(
      "🎉 Pump.fun trade executed successfully. Signature:",
      signature,
    );

    const profitOrLoss = Math.random() * 10 - 5; // Simulated profit/loss
    logTradeDetails(
      { mint: outputMint, volume: amount, price: 0 },
      amount,
      profitOrLoss,
    );

    successfulTrades++;
  } catch (error) {
    console.error("🚨 Error executing trade:", error);
  } finally {
    const executionTime = Date.now() - startTime;
    totalExecutionTime += executionTime;
    totalTrades++;

    console.log(`⏱️ Trade execution time: ${executionTime} ms`);
  }
}

// Planned for detailed logging during future trade executions.
function logTradeDetails(
  tradeData: TradeData,
  amount: number,
  profitOrLoss: number,
) {
  const timestamp = new Date().toISOString();
  console.log("📊 Trade Details:");
  console.log(`  Timestamp: ${timestamp}`);
  console.log(`  Token Mint: ${tradeData.mint}`);
  console.log(`  Trade Amount: ${amount}`);
  console.log(`  Profit/Loss: ${profitOrLoss.toFixed(2)}`);
}

// Planned for future trade analysis phases.
// function logTradeStatistics() {
//   const successRate = (successfulTrades / totalTrades) * 100 || 0;
//   const averageExecutionTime = totalExecutionTime / totalTrades || 0;
//
//   console.log("📈 Trade Statistics:");
//   console.log(`  Total Trades: ${totalTrades}`);
//   console.log(`  Successful Trades: ${successfulTrades}`);
//   console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
//   console.log(
//     `  Average Execution Time: ${averageExecutionTime.toFixed(2)} ms`,
//   );
// }

// Planned for future testing purposes and validation.
// async function testShouldSnipe() {
//   console.log("🧪 Starting test for shouldSnipe logic...");

//   // Sample mock TradeData
//   const mockTradeData: TradeData[] = [
//     {
//       mint: "So11111111111111111111111111111111111111112",
//       volume: 600, // Above the volume threshold
//       price: 2.0, // Above the price threshold
//     },
//     {
//       mint: "So11111111111111111111111111111111111111113",
//       volume: 300, // Below the volume threshold
//       price: 1.0, // Below the price threshold
//     },
//     {
//       mint: "So11111111111111111111111111111111111111114",
//       volume: 700, // Above the volume threshold
//       price: 1.8, // Above the price threshold
//     },
//   ];

//   for (const tradeData of mockTradeData) {
//     console.log(`🔍 Testing TradeData: ${JSON.stringify(tradeData)}`);
//     const isSnipeCandidate = await shouldSnipe(tradeData);
//     console.log(
//       `  Result: ${
//         isSnipeCandidate
//           ? "✅ Meets sniping criteria"
//           : "❌ Does not meet sniping criteria"
//       }`,
//     );
//   }

//   console.log("🎉 Test for shouldSnipe logic completed!");
// }

/**
 * Main function to run the bot in a structured sequence.
 */
async function main() {
  const argv: CommandLineArgs = (await yargs(hideBin(process.argv))
    .option("inputMint", { type: "string" })
    .option("outputMint", { type: "string" })
    .option("amount", { type: "number" })
    .option("slippage", { type: "number" })
    .option("strategy", { type: "string", choices: ["pumpfun", "longterm"] }) // Add strategy option
    // TODO: Ensure 'strategy' is explicitly defined in the CommandLineArgs type in types.js
    .option("test", { type: "boolean" })
    .help().argv) as CommandLineArgs;

  if (argv.test) {
    console.log("🧪 Running in test mode...");
    return;
  }

  const config = readConfig() as Config;
  const inputMint = argv.inputMint || config.tokenAddress;
  const amount = argv.amount || config.amount;

  if (!argv.strategy) {
    console.error("🚨 Missing required parameter: --strategy");
    process.exit(1);
  }

  switch (argv.strategy) {
    case "pumpfun":
      await pumpFunStrategy(inputMint, amount);
      break;
    case "longterm":
      await longTermStrategy();
      break;
    default:
      console.error(
        "🚨 Invalid strategy. Use --strategy=pumpfun or --strategy=longterm.",
      );
      process.exit(1);
  }
}

main();
