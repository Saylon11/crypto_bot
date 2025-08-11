// Dev exhaustion detector - simplified version

function detectDevExhaustion(walletData) {
  // Ensure we have valid input
  if (!walletData || !Array.isArray(walletData)) {
    return {
      exhausted: false,
      remainingPercentage: 100,
      devWallets: []
    };
  }

  // Simple detection based on sell pressure
  const totalTx = walletData.length;
  const sellTx = walletData.filter(tx => tx.type === 'sell').length;
  
  const sellRatio = totalTx > 0 ? sellTx / totalTx : 0;
  
  return {
    exhausted: sellRatio > 0.7, // 70% sells = exhaustion
    remainingPercentage: 100 - (sellRatio * 100),
    devWallets: []
  };
}

module.exports = {
  detectDevExhaustion
};
