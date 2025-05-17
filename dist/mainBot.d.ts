import type { TradeData } from "./types";
/**
 * Determines if a token is a good sniping candidate based on configurable criteria.
 * @param tradeData Trade data for the token.
 * @returns True if the token meets sniping criteria, false otherwise.
 */
export declare function shouldSnipe(tradeData: TradeData): Promise<boolean>;
