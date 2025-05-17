"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchBehaviorFromHelius = fetchBehaviorFromHelius;
/**
 * Estimate wallet concentration depth from Helius transfers
 */
function analyzeWalletConcentration(transfers) {
    const walletSums = {};
    for (const tx of transfers) {
        const to = tx.toUserAccount || "unknown";
        const amount = parseFloat(tx.amount || "0");
        if (!walletSums[to]) {
            walletSums[to] = 0;
        }
        walletSums[to] += amount;
    }
    const sortedHolders = Object.values(walletSums).sort((a, b) => b - a);
    const totalHeld = sortedHolders.reduce((a, b) => a + b, 0);
    const top5 = sortedHolders.slice(0, 5).reduce((a, b) => a + b, 0);
    const top10 = sortedHolders.slice(0, 10).reduce((a, b) => a + b, 0);
    const top20 = sortedHolders.slice(0, 20).reduce((a, b) => a + b, 0);
    const concentration5 = (top5 / totalHeld) * 100;
    const concentration10 = (top10 / totalHeld) * 100;
    const concentration20 = (top20 / totalHeld) * 100;
    if (concentration5 > 80)
        return 5;
    if (concentration10 > 40)
        return 10;
    return 20;
}
const axios_1 = __importDefault(require("axios"));
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS;
/**
 * Fetch behavioral token transfer data from Helius using a known wallet address.
 */
async function fetchBehaviorFromHelius(walletAddress) {
    console.log("📡 Fetching token behavior from Helius for wallet:", walletAddress);
    if (!HELIUS_API_KEY || !TOKEN_ADDRESS) {
        throw new Error("HELIUS_API_KEY or TEST_TOKEN_ADDRESS is missing from environment variables!");
    }
    const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=100`;
    try {
        const response = await axios_1.default.get(url);
        const transactions = response.data || [];
        console.log(`📊 Fetched ${transactions.length} raw transactions from Helius`);
        const walletTransfers = transactions.flatMap((tx, index) => {
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
            return combinedTransfers.map((t) => {
                if (!t)
                    return null;
                return {
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
                    totalBalance: 1000
                };
            }).filter(Boolean);
        });
        if (!walletTransfers.length) {
            console.warn("⚠️ No valid transfers parsed from transactions.");
            return [];
        }
        const walletData = walletTransfers.map((t) => ({
            walletAddress: t.from,
            tokenAddress: t.mint,
            amount: parseFloat(t.amount),
            timestamp: t.timestamp,
            priceChangePercent: t.priceChangePercent,
            totalBalance: t.totalBalance,
        }));
        const walletDepthTarget = analyzeWalletConcentration(walletData);
        console.log(`🧠 Wallet Concentration Target: Top ${walletDepthTarget} wallets`);
        console.log(`✅ Parsed ${walletData.length} behavioral events from Helius.`);
        return walletData;
    }
    catch (error) {
        console.error(`🚨 Error fetching behavioral data from Helius for wallet ${walletAddress} at URL: ${url}`, error);
        return [];
    }
}
//# sourceMappingURL=apiClient.js.map