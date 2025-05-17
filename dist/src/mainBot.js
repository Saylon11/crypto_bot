"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldSnipe = shouldSnipe;
exports.executeTradeFlow = executeTradeFlow;
exports.startBot = startBot;
exports.stopBot = stopBot;
exports.getStatus = getStatus;
const fs_1 = __importDefault(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const qnAPI_1 = require("./qnAPI"); // Import custom types
const pumpFunStrategy_1 = require("../strategies/pumpFunStrategy");
const longTermStrategy_1 = require("../strategies/longTermStrategy");
const CONFIG_FILE_PATH = "./config.json"; // Adjust the path if necessary
// Load environment variables
dotenv_1.default.config();
console.log("QuickNode RPC URL:", process.env.QUICKNODE_RPC_URL);
console.log("QuickNode WS URL:", process.env.QUICKNODE_WS_URL);
console.log("Metis Jupiter API URL:", process.env.METIS_JUPITER_API_URL);
/**
 * Reads configuration from a JSON file.
 * @returns Configuration object.
 */
function readConfig() {
    try {
        if (fs_1.default.existsSync(CONFIG_FILE_PATH)) {
            const configData = fs_1.default.readFileSync(CONFIG_FILE_PATH, "utf-8");
            return JSON.parse(configData);
        }
        else {
            throw new Error(`Config file not found at ${CONFIG_FILE_PATH}`);
        }
    }
    catch (error) {
        console.error("🚨 Error reading configuration file:", error);
        process.exit(1); // Exit the application if the configuration is invalid
    }
}
/**
 * Determines if a token is a good sniping candidate based on configurable criteria.
 * @param tradeData Trade data for the token.
 * @returns True if the token meets sniping criteria, false otherwise.
 */
async function shouldSnipe(tradeData) {
    const config = readConfig();
    const { mint, volume, price } = tradeData;
    const jwtToken = await (0, qnAPI_1.authenticateRugCheck)(); // Authenticate and retrieve JWT token
    // Planned for future RugCheck API expansions.
    console.log("🔑 RugCheck JWT token retrieved.");
    const tokenReport = await (0, qnAPI_1.getTokenReport)(mint); // Get RugCheck token report with explicit type
    console.log(`🔍 RugCheck report for token ${mint}:`, tokenReport);
    const liquidityPools = await (0, qnAPI_1.getLiquidityPools)();
    const tokenLiquidity = liquidityPools.reduce((total, pool) => total + pool.liquidity, 0);
    const volumeIncrease = volume > config.volumeThreshold;
    const priceSpike = price > config.priceThreshold;
    const sufficientLiquidity = tokenLiquidity > config.minimumLiquidity;
    const isRisky = tokenReport.riskAssessment === "high" || tokenReport.scamReports > 0;
    console.log(`🔍 Analyzing token ${mint}:`);
    console.log(`  Volume Increase: ${volumeIncrease}`);
    console.log(`  Price Spike: ${priceSpike}`);
    console.log(`  Sufficient Liquidity: ${sufficientLiquidity} (Liquidity: ${tokenLiquidity}, Min: ${config.minimumLiquidity})`);
    console.log(`  RugCheck Risk Assessment: ${isRisky ? "High Risk" : "Low Risk"}`);
    return volumeIncrease && priceSpike && sufficientLiquidity && !isRisky;
}
// These variables are planned for use with executeTradeFlow and logTradeStatistics in future phases.
let totalTrades = 0; // Planned for detailed future trade statistics tracking.
let successfulTrades = 0; // Planned for detailed future trade statistics tracking.
let totalExecutionTime = 0; // Planned for detailed future trade statistics tracking.
/**
 * Executes a trade flow for a given input and output mint.
 * @param inputMint The input token mint address.
 * @param outputMint The output token mint address.
 * @param amount The amount to trade.
 */
async function executeTradeFlow(inputMint, outputMint, amount) {
    const config = readConfig();
    if (amount > config.maxTradeSize) {
        console.log("⚠️ Trade size exceeds maximum limit. Skipping trade.");
        return;
    }
    const startTime = Date.now();
    try {
        console.log("🔍 Fetching Pump.fun swap quote...");
        const signature = await (0, qnAPI_1.executePumpFunSwap)(outputMint, "BUY", amount);
        console.log("🎉 Pump.fun trade executed successfully. Signature:", signature);
        // Explicitly simulated profit/loss; replace with actual logic after integration.
        const profitOrLoss = Math.random() * 10 - 5;
        logTradeDetails({ mint: outputMint, volume: amount, price: 0 }, amount, profitOrLoss);
        successfulTrades++;
    }
    catch (error) {
        console.error("🚨 Error executing trade:", error);
    }
    finally {
        const executionTime = Date.now() - startTime;
        totalExecutionTime += executionTime;
        totalTrades++;
        console.log(`⏱️ Trade execution time: ${executionTime} ms`);
    }
}
// Planned for detailed logging during future trade executions.
function logTradeDetails(tradeData, amount, profitOrLoss) {
    const timestamp = new Date().toISOString();
    console.log("📊 Trade Details:");
    console.log(`  Timestamp: ${timestamp}`);
    console.log(`  Token Mint: ${tradeData.mint}`);
    console.log(`  Trade Amount: ${amount}`);
    console.log(`  Profit/Loss: ${profitOrLoss.toFixed(2)}`);
}
/**
 * Determines strategy dynamically based on current market conditions.
 */
function determineStrategyBasedOnMarket() {
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 12) {
        return {
            selectedStrategy: "pumpfun",
            reason: "Meme coins are most volatile in early hours (UTC)",
        };
    }
    else {
        return {
            selectedStrategy: "longterm",
            reason: "Later hours favor more stable long-term trends",
        };
    }
}
/**
 * Main function to run the bot in a structured sequence.
 */
async function main() {
    const argv = (await (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
        .option("inputMint", { type: "string", demandOption: true })
        .option("outputMint", { type: "string", demandOption: true })
        .option("amount", { type: "number", demandOption: true })
        .option("slippage", { type: "number" })
        // .option("strategy", {
        //   type: "string",
        //   choices: ["pumpfun", "longterm"],
        //   demandOption: true,
        // }) // Strategy option now determined dynamically
        .option("test", { type: "boolean" })
        .help().argv);
    if (argv.test) {
        console.log("🧪 Running in test mode...");
        return;
    }
    const config = readConfig();
    const inputMint = argv.inputMint || config.tokenAddress;
    const amount = argv.amount || config.amount;
    const strategyDecision = determineStrategyBasedOnMarket();
    console.log(`🧠 Selected strategy: ${strategyDecision.selectedStrategy}`);
    console.log(`📌 Reason: ${strategyDecision.reason}`);
    switch (strategyDecision.selectedStrategy) {
        case "pumpfun":
            await (0, pumpFunStrategy_1.pumpFunStrategy)(inputMint, amount);
            break;
        case "longterm":
            await (0, longTermStrategy_1.longTermStrategy)();
            break;
    }
}
main();
// Bot state variables
let botRunning = false;
let currentStrategy = null;
async function startBot(strategy) {
    if (botRunning) {
        console.log("⚠️ Bot is already running.");
        return;
    }
    botRunning = true;
    currentStrategy = strategy;
    console.log(`🚀 Starting bot with strategy: ${strategy}`);
    try {
        switch (strategy) {
            case "pumpfun":
                await (0, pumpFunStrategy_1.pumpFunStrategy)(readConfig().tokenAddress, readConfig().amount);
                break;
            case "longterm":
                await (0, longTermStrategy_1.longTermStrategy)();
                break;
        }
    }
    catch (error) {
        console.error("🚨 Error during bot execution:", error);
    }
    finally {
        botRunning = false;
        console.log("✅ Bot execution completed.");
    }
}
async function stopBot() {
    if (!botRunning) {
        console.log("🛑 Bot is already stopped.");
        return;
    }
    botRunning = false;
    console.log("🧼 StopBot requested – graceful shutdown not yet implemented.");
}
function getStatus() {
    return {
        running: botRunning,
        strategy: currentStrategy,
        totalTrades,
        successfulTrades,
        totalExecutionTime,
    };
}
//# sourceMappingURL=mainBot.js.map