import { devWallets } from "../src/data/devWalletList";
import dotenv from "dotenv";
dotenv.config();

import axios from "axios";
import { url } from "inspector";
import { detectPanicSelling } from "../src/modules/panicSellDetector";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY as string;
const TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS as string;

async function fetchAndDebugTransactions() {
  console.log("🔍 Helius Transaction Debugger Starting...");

  if (!HELIUS_API_KEY || !TOKEN_ADDRESS) {
    throw new Error("HELIUS_API_KEY or TEST_TOKEN_ADDRESS is missing from environment variables!");
  }

  const walletAddress = "Bms1gxfUxts2DUwooxd6hTq3tANPh8KBadgJpPNEaLyP"; // Hoot Wallet
  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}`;
  
  try {
    const response = await axios.get(url);
    const transactions = response.data || [];

    // Future: Look into postTokenBalances and accountData[].tokenBalanceChanges for swap tracking

    console.log(`🧾 Total transactions pulled: ${transactions.length}`);

    const walletTransfers = transactions.flatMap((tx: any, index: number) => {
      const transfers = tx?.events?.tokenTransfers || [];

      // Fallback: check parsedInstructions and instructions if tokenTransfers is empty.
      // Extended fallback for Jupiter/Raydium: extract transfer info from raw SPL Token instructions.
      const fallbackTransfers =
        transfers.length > 0
          ? []
          : [
              ...(tx?.events?.parsedInstructions || []),
              ...(tx?.parsedInstructions || []),
              ...(tx?.instructions || []),
              ...(tx?.transaction?.message?.instructions || []),
              ...(tx?.nativeTransfers || [])
            ]
              .filter((inst: any) => {
                const programOk =
                  inst?.programId === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA" ||
                  inst?.parsed?.info?.mint === TOKEN_ADDRESS;

                const hasTransferFields =
                  inst?.parsed?.info?.amount || inst?.amount;

                const isSOLTransfer = inst?.fromUserAccount && inst?.toUserAccount;

                return programOk || hasTransferFields || isSOLTransfer;
              })
              .map((inst: any) => {
                const source =
                  inst.parsed?.info?.source ||
                  inst.fromUserAccount ||
                  inst.accounts?.[0];

                const destination =
                  inst.parsed?.info?.destination ||
                  inst.toUserAccount ||
                  inst.accounts?.[1];

                const rawAmount =
                  inst.parsed?.info?.amount || inst.amount || "0";

                const parsedAmount = parseFloat(rawAmount);

                if (!parsedAmount || parsedAmount === 0) return null;

                return {
                  fromUserAccount: source,
                  toUserAccount: destination,
                  amount: parsedAmount,
                };
              })
              .filter(Boolean);

      const combinedTransfers = transfers.length > 0 ? transfers : fallbackTransfers;

      return combinedTransfers.map((t: any) => ({
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

    walletTransfers.forEach((tx: any, index: number) => {
      console.log(`\n--- Transfer Event ${index + 1} ---`);
      console.log(`Timestamp: ${new Date(tx.timestamp).toUTCString()}`);
      console.log(`From: ${tx.from}`);
      console.log(`To: ${tx.to}`);
      console.log(`Amount: ${tx.amount}`);
      console.log(`Token Mint: ${tx.mint}`);
    });

    type WalletData = {
      walletAddress: string;
      tokenAddress: string;
      amount: number;
      timestamp: number;
      priceChangePercent: number;
      totalBalance: number;
    };

    const walletDataLike: WalletData[] = walletTransfers.map((t: any) => ({
      walletAddress: t.from,
      tokenAddress: t.mint,
      amount: parseFloat(t.amount),
      timestamp: t.timestamp,
      priceChangePercent: t.priceChangePercent,
      totalBalance: t.totalBalance,
    }));

    const panicReport = detectPanicSelling(walletDataLike);
    console.log(`\n📉 Panic Sell Score: ${panicReport.panicScore}%`);
    console.log(`😱 Panic Insight: ${panicReport.comment}`);
  } catch (error) {
    console.error("🚨 Error during Helius debug fetch:", error);
  }
}

// Run debugger immediately if executed directly
fetchAndDebugTransactions();