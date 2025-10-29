// Quick fix for the connection function
function getConnection(): Connection {
  const heliusKey = process.env.HELIUS_API_KEY;
  
  // Check if Helius key exists and looks valid
  if (heliusKey && heliusKey !== 'your_key' && heliusKey.length > 30) {
    console.log('🌐 Trying Helius RPC...');
    try {
      return new Connection(`https://mainnet.helius-rpc.com/?api-key=${heliusKey}`, 'confirmed');
    } catch (error) {
      console.log('⚠️  Helius failed, falling back to public RPC');
    }
  }
  
  console.log('🌐 Using public RPC');
  return new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
}
