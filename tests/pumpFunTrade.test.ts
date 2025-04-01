import { executePumpFunSwap } from "../src/qnAPI";

(async () => {
  try {
    const mint = "So11111111111111111111111111111111111111112"; // Example mint address
    const type = "BUY";
    const amount = 1000000; // Example amount in smallest units

    console.log("🚀 Testing Pump.fun trade...");
    const signature = await executePumpFunSwap(mint, type, amount);
    console.log("✅ Pump.fun trade test successful. Signature:", signature);
  } catch (error) {
    console.error("🚨 Pump.fun trade test failed:", error);
  }
})();
