import { Connection, Keypair, Transaction } from "@solana/web3.js";
import type { LiquidityPool, TokenReport, NewToken } from "./types";
export declare const QUICKNODE_RPC_URL: string;
export declare const METIS_JUPITER_SWAP_API: string;
export declare const WALLET_SECRET_KEY: string;
export declare const RUGCHECK_API_URL: string;
export declare const RUGCHECK_API_KEY: string;
export declare const QUICKNODE_WS_URL: string;
export declare const connection: Connection;
export declare function loadWalletKeypair(): Keypair;
export declare const walletKeypair: Keypair;
export declare function getLiquidityPools(): Promise<LiquidityPool[]>;
/**
 * Executes a Pump.fun swap transaction.
 * @param mint The mint address of the token.
 * @param type The type of transaction ("BUY" or "SELL").
 * @param amount The amount of the token to swap (in smallest units).
 * @returns The transaction signature.
 */
export declare function executePumpFunSwap(mint: string, type: "BUY" | "SELL", amount: number): Promise<string>;
/**
 * Monitors Pump.fun trades and executes a callback for each trade.
 * @param callback The callback function to execute for each trade.
 */
export declare function monitorPumpFunTrades(callback: (tradeData: Record<string, unknown>) => Promise<void>): void;
/**
 * Creates a test transaction for Jito bundle simulation.
 * @returns A test transaction.
 */
export declare function createTestTransaction(): Transaction;
/**
 * Sends a Jito bundle to the Solana network.
 * @param transactions The transactions to include in the bundle.
 * @param simulate Whether to simulate the bundle instead of sending it.
 * @returns The result of the bundle submission.
 */
export declare function sendJitoBundle(transactions: Transaction[], simulate?: boolean): Promise<{
    success: boolean;
}>;
/**
 * Authenticates with RugCheck.xyz and retrieves a JWT token.
 * @returns The JWT token as a string.
 */
export declare function authenticateRugCheck(): Promise<string>;
/**
 * Fetches the token report from RugCheck.xyz.
 * @param tokenAddress The address of the token to fetch the report for.
 * @returns The token report as an object.
 */
export declare function getTokenReport(tokenAddress: string): Promise<TokenReport>;
/**
 * Fetches new tokens from RugCheck.xyz.
 * @returns An array of new tokens.
 */
export declare function getNewTokens(): Promise<NewToken[]>;
