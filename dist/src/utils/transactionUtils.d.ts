/**
 * Decodes, signs, sends, and confirms a swap transaction.
 * @param swapTransaction The base58-encoded transaction string.
 * @returns The transaction signature.
 */
export declare function executeSwapTransaction(swapTransaction: string): Promise<string>;
