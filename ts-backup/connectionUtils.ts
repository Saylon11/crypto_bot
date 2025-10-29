// HootBot/src/utils/connectionUtils.ts

import { Connection, Commitment } from '@solana/web3.js';

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    const rpcUrl = process.env.HELIUS_API_KEY 
      ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
      : process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
    
    const commitment: Commitment = 'confirmed';
    
    connection = new Connection(rpcUrl, commitment);
    
    console.log(`🔗 Connected to Solana RPC: ${rpcUrl.includes('helius') ? 'Helius' : 'Public'}`);
  }
  
  return connection;
}