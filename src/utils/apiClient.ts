import axios from "axios";
import { WalletData } from "../types";
import {
  analyzeWalletConcentration,
  TransferConcentrationInput,
} from "../modules/walletConcentration"; // Corrected path

const HELIUS_API_KEY = process.env.HELIUS_API_KEY as string;
const TOKEN_ADDRESS = process.env.TEST_TOKEN_ADDRESS as string;

/**
 * Fetch behavioral token transfer data from Helius using a known wallet address.
 */
export async function fetchBehaviorFromHelius(walletAddress: string): Promise<WalletData[]> {
  console.log("📡 Fetching token behavior from Helius for wallet:", walletAddress);

  if (!HELIUS_API_KEY || !TOKEN_ADDRESS) {
    throw new Error("HELIUS_API_KEY or TEST_TOKEN_ADDRESS is missing from environment variables!");
  }

  const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions?api-key=${HELIUS_API_KEY}&limit=100`;

  try {
    const response = await axios.get(url);
    const transactions = response.data || [];
    console.log(`📊 Fetched ${transactions.length} raw transactions from Helius`);

    // Define the type for elements in walletTransfers for clarity
    const walletTransfers: TransferConcentrationInput[] = transactions.flatMap((tx: any) => { // Removed index as it's not used
      const transfers = tx?.events?.tokenTransfers || [];

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

                const hasTransferFields = inst?.parsed?.info?.amount || inst?.amount;
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

                const rawAmount = inst.parsed?.info?.amount || inst.amount || "0";
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

      return combinedTransfers.map((t: any) => {
        if (!t) return null;
        return {
          timestamp: tx.blockTime
            ? tx.blockTime * 1000
            : tx.timestamp
            ? new Date(tx.timestamp).getTime()
            : Date.now(),
          from: t.fromUserAccount || t.source || t.accountKeys?.[0] || "unknown",
          to: t.toUserAccount || t.destination || t.accountKeys?.[1] || "unknown",
          amount: parseFloat(t.amount || t.parsed?.info?.amount || "0"),
          mint: TOKEN_ADDRESS, // Assuming TOKEN_ADDRESS is the relevant mint for this analysis
          priceChangePercent: 0, // Placeholder
          totalBalance: 1000 // Placeholder
        };
      }).filter(Boolean);
    });

    if (!walletTransfers.length) {
      console.warn("⚠️ No valid transfers parsed from transactions.");
      return [];
    }

    const walletData: WalletData[] = walletTransfers.map((t: any) => ({
      walletAddress: t.from,
      tokenAddress: t.mint,
      amount: t.amount, // t.amount is already a number from walletTransfers mapping
      timestamp: t.timestamp,
      priceChangePercent: t.priceChangePercent,
      totalBalance: t.totalBalance,
    }));

    // Call analyzeWalletConcentration with walletTransfers, which contains 'toUserAccount' and 'amount' fields
    const walletDepthTarget = analyzeWalletConcentration(walletTransfers);
    console.log(`🧠 Wallet Concentration Target: Top ${walletDepthTarget} wallets`);
    console.log(`✅ Parsed ${walletData.length} behavioral events from Helius.`);
    return walletData;
  } catch (error) {
    console.error(`🚨 Error fetching behavioral data from Helius for wallet ${walletAddress} at URL: ${url}`, error);
    return [];
  }
}