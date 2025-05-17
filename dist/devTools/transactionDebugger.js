"use strict";
// src/devTools/transactionDebugger.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const panicSellDetector_1 = require("../modules/panicSellDetector");
const yargs_1 = require("yargs");
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS;
async function fetchAndDebugTransactions() {
    console.log("🔍 Helius Transaction Debugger Starting...");
    if (!HELIUS_API_KEY || !TOKEN_ADDRESS) {
        throw new Error("HELIUS_API_KEY or TEST_TOKEN_ADDRESS is missing from environment variables!");
    }
    const walletAddress = "Bms1gxfUxts2DUwooxd6hTq3tANPh8KBadgJpPNEaLyP"; // Hoot Wallet
    const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}`;
    let walletTransfers = [];
    try {
        const response = await axios_1.default.get(url);
        const transactions = response.data || [];
        console.log(`🧾 Total transactions pulled: ${transactions.length}`);
        walletTransfers = transactions.flatMap((tx, index) => {
            const transfers = tx?.events?.tokenTransfers || [];
            const fallbackTransfers = transfers.length > 0
                ? []
                : [
                    ...(tx?.events?.parsedInstructions || []),
                    ...(tx?.parsedInstructions || []),
                    ...(tx?.instructions || []),
                    ...(tx?.transaction?.message?.instructions || []),
                    ...(tx?.nativeTransfers || [])
                ]
                    .filter((inst) => {
                    const programOk = inst?.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" ||
                        inst?.parsed?.info?.mint === TOKEN_ADDRESS;
                    const hasTransferFields = inst?.parsed?.info?.amount || inst?.amount;
                    const isSOLTransfer = inst?.fromUserAccount && inst?.toUserAccount;
                    return programOk || hasTransferFields || isSOLTransfer;
                })
                    .map((inst) => {
                    const source = inst.parsed?.info?.source ||
                        inst.fromUserAccount ||
                        inst.accounts?.[0];
                    const destination = inst.parsed?.info?.destination ||
                        inst.toUserAccount ||
                        inst.accounts?.[1];
                    const rawAmount = inst.parsed?.info?.amount || inst.amount || "0";
                    const parsedAmount = parseFloat(rawAmount);
                    if (!parsedAmount || parsedAmount === 0)
                        return null;
                    return {
                        fromUserAccount: source,
                        toUserAccount: destination,
                        amount: parsedAmount,
                    };
                })
                    .filter(Boolean);
            const combinedTransfers = transfers.length > 0 ? transfers : fallbackTransfers;
            return combinedTransfers.map((t) => ({
                timestamp: tx.blockTime
                    ? tx.blockTime * 1000
                    : tx.timestamp
                        ? new Date(tx.timestamp).getTime()
                        : Date.now(),
                from: t.fromUserAccount || t.source || t.accountKeys?.[0] || "unknown",
                to: t.toUserAccount || t.destination || t.accountKeys?.[1] || "unknown",
                amount: parseFloat(t.amount || t.parsed?.info?.amount || "0"),
                mint: TOKEN_ADDRESS,
                priceChangePercent: 0,
                totalBalance: 1000,
            }));
        });
        if (!walletTransfers.length) {
            console.log("⚠️ No transfer events found via tokenTransfers or parsedInstructions.");
            return;
        }
        walletTransfers.forEach((tx, index) => {
            console.log(`\n--- Transfer Event ${index + 1} ---`);
            console.log(`Timestamp: ${new Date(tx.timestamp).toUTCString()}`);
            console.log(`From: ${tx.from}`);
            console.log(`To: ${tx.to}`);
            console.log(`Amount: ${tx.amount}`);
            console.log(`Token Mint: ${tx.mint}`);
        });
        tokenAddress: yargs_1.string;
        amount: yargs_1.number;
        timestamp: yargs_1.number;
        priceChangePercent: yargs_1.number;
        totalBalance: yargs_1.number;
        const walletDataLike = walletTransfers.map((t) => ({
            type: "trade",
            address: t.from,
            walletAddress: t.from, // Ensure walletAddress is included
            tokenAddress: t.mint,
            amount: parseFloat(t.amount),
            timestamp: t.timestamp,
            priceChangePercent: t.priceChangePercent,
            totalBalance: t.totalBalance,
        }));
        const panicReport = (0, panicSellDetector_1.detectPanicSelling)(walletDataLike);
        console.log(`\n📉 Panic Sell Score: ${panicReport.panicScore}%`);
        console.log(`😱 Panic Insight: ${panicReport.comment}`);
    }
    catch (error) {
        console.error("🚨 Error during Helius debug fetch:", error);
    }
}
// Run debugger immediately if executed directly
fetchAndDebugTransactions();
//# sourceMappingURL=transactionDebugger.js.map