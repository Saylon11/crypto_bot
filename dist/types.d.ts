export interface TradeData {
    tokenMint: string;
    amount: number;
    side: 'buy' | 'sell';
    timestamp: number;
    signature?: string;
}
export interface CommandLineArgs {
    target?: string;
    amount?: number;
    mode?: string;
}
export interface Config {
    rpcUrl: string;
    walletSecretKey: string;
    targetToken?: string;
    tradeAmount: number;
    slippage: number;
}
export interface TokenReport {
    tokenMint: string;
    name?: string;
    symbol?: string;
    price?: number;
    volume24h?: number;
    marketCap?: number;
    holders?: number;
    rugProbability?: number;
    devActivity?: number;
}
export interface NewToken {
    mint: string;
    name?: string;
    symbol?: string;
    createdAt: number;
    creator?: string;
}
export interface WalletData {
    address: string;
    balance: number;
    type?: 'buy' | 'sell';
    timestamp?: number;
    amount?: number;
}
