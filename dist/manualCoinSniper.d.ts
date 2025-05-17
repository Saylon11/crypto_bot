/**
 * Manual Coin Sniper Utility
 *
 * Purpose: Watch for manually selected high-profile token launches (ex: Trump Coin, Tate Coin).
 * If detected, trigger fast buying action and hand off token to mindEngine.ts for full behavioral monitoring.
 */
export declare const manualWatchlist: string[];
export declare function checkTokenAgainstWatchlist(tokenName: string): boolean;
export declare function attemptManualSnipe(tokenName: string): Promise<void>;
