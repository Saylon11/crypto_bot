import type { TradeData } from "./types";
/**
 * Determines if a token is a good sniping candidate based on configurable criteria.
 * @param tradeData Trade data for the token.
 * @returns True if the token meets sniping criteria, false otherwise.
 */
export declare function shouldSnipe(tradeData: TradeData): Promise<boolean>;
/**
 * Executes a trade flow for a given input and output mint.
 * @param inputMint The input token mint address.
 * @param outputMint The output token mint address.
 * @param amount The amount to trade.
 */
export declare function executeTradeFlow(inputMint: string, outputMint: string, amount: number): Promise<void>;
export declare function startBot(strategy: "pumpfun" | "longterm"): Promise<void>;
export declare function stopBot(): Promise<void>;
export declare function getStatus(): {
    running: boolean;
    strategy: "pumpfun" | "longterm" | null;
    totalTrades: number;
    successfulTrades: number;
    totalExecutionTime: number;
};
