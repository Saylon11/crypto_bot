import fs from "fs";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  executePumpFunSwap,
  getLiquidityPools,
  authenticateRugCheck,
  getTokenReport,
} from "./qnAPI.js"; // Import custom types
import type {
  TradeData,
  CommandLineArgs,
  Config,
  LiquidityPool,
  TokenReport, // Import TokenReport type
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

  const jwtToken = await authenticateRugCheck(); // Authenticate and retrieve JWT token
  // Planned for future RugCheck API expansions.
  console.log("🔑 RugCheck JWT token retrieved.");

  const tokenReport: TokenReport = await getTokenReport(mint); // Get RugCheck token report with explicit type
  console.log(`🔍 RugCheck report for token ${mint}:`, tokenReport);

  const liquidityPools = await getLiquidityPools();
  const tokenLiquidity = liquidityPools.reduce(
    (total: number, pool: LiquidityPool) => total + pool.liquidity,
    0,
  );

  const volumeIncrease = volume > config.volumeThreshold;
  const priceSpike = price > config.priceThreshold;
  const sufficientLiquidity = tokenLiquidity > config.minimumLiquidity;
  const isRisky =
    tokenReport.riskAssessment === "high" || tokenReport.scamReports > 0;

  console.log(`🔍 Analyzing token ${mint}:`);
  console.log(`  Volume Increase: ${volumeIncrease}`);
  console.log(`  Price Spike: ${priceSpike}`);
  console.log(
    `  Sufficient Liquidity: ${sufficientLiquidity} (Liquidity: ${tokenLiquidity}, Min: ${config.minimumLiquidity})`,
  );
  console.log(
    `  RugCheck Risk Assessment: ${isRisky ? "High Risk" : "Low Risk"}`,
  );

  return volumeIncrease && priceSpike && sufficientLiquidity && !isRisky;
}

// These variables are planned for use with executeTradeFlow and logTradeStatistics in future phases.
let totalTrades: number = 0; // Planned for detailed future trade statistics tracking.
let successfulTrades: number = 0; // Planned for detailed future trade statistics tracking.
let totalExecutionTime: number = 0; // Planned for detailed future trade statistics tracking.

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

    // Explicitly simulated profit/loss; replace with actual logic after integration.
    const profitOrLoss = Math.random() * 10 - 5;
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

/**
 * Main function to run the bot in a structured sequence.
 */
async function main() {
  const argv: CommandLineArgs = (await yargs(hideBin(process.argv))
    .option("inputMint", { type: "string", demandOption: true })
    .option("outputMint", { type: "string", demandOption: true })
    .option("amount", { type: "number", demandOption: true })
    .option("slippage", { type: "number" })
    .option("strategy", {
      type: "string",
      choices: ["pumpfun", "longterm"],
      demandOption: true,
    }) // Add strategy option
    .option("test", { type: "boolean" })
    .help().argv) as CommandLineArgs;

  if (argv.test) {
    console.log("🧪 Running in test mode...");
    return;
  }

  const config = readConfig() as Config;
  const inputMint = argv.inputMint || config.tokenAddress;
  const amount = argv.amount || config.amount;

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
