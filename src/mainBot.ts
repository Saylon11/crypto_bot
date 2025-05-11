import fs from "fs";
import dotenv from "dotenv";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
  executePumpFunSwap,
  authenticateRugCheck,
  getTokenReport,
} from "./qnAPI"; // Import custom types
import type {
  TradeData,
  CommandLineArgs,
  Config,
  TokenReport,
} from "./types"; // Import custom types

const CONFIG_FILE_PATH = "./config.json"; // Adjust the path if necessary

// Load environment variables
dotenv.config();
console.log("QuickNode RPC URL:", process.env.QUICKNODE_RPC_URL);
console.log("Metis Jupiter Swap API:", process.env.METIS_JUPITER_SWAP_API); // Updated log

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
  console.log("🔑 RugCheck JWT token retrieved.");

  const tokenReport: TokenReport = await getTokenReport(mint); // Get RugCheck token report with explicit type
  console.log(`🔍 RugCheck report for token ${mint}:`, tokenReport);

  const volumeIncrease = volume > config.volumeThreshold;
  const priceSpike = price > config.priceThreshold;
  const isRisky =
    tokenReport.riskAssessment === "high" || tokenReport.scamReports > 0;

  console.log(`🔍 Analyzing token ${mint}:`);
  console.log(`  Volume Increase: ${volumeIncrease}`);
  console.log(`  Price Spike: ${priceSpike}`);
  console.log(
    `  RugCheck Risk Assessment: ${isRisky ? "High Risk" : "Low Risk"}`,
  );

  return volumeIncrease && priceSpike && !isRisky;
}

// Removed legacy strategy references (pumpfun, longterm)

/**
 * Main function to run the bot in a structured sequence.
 */
async function main() {
  const argv: CommandLineArgs = (await yargs(hideBin(process.argv))
    .option("inputMint", { type: "string", demandOption: true })
    .option("outputMint", { type: "string", demandOption: true })
    .option("amount", { type: "number", demandOption: true })
    .option("slippage", { type: "number" })
    .option("test", { type: "boolean" })
    .help().argv) as CommandLineArgs;

  if (argv.test) {
    console.log("🧪 Running in test mode...");
    return;
  }

  const config = readConfig() as Config;
  const inputMint = argv.inputMint || config.tokenAddress;
  const amount = argv.amount || config.amount;

  console.log("🚀 Starting bot...");
  console.log(`Input Mint: ${inputMint}, Amount: ${amount}`);
}

main();
