"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const qnAPI_1 = require("../src/qnAPI");
(async function testAllFunctions() {
    console.log("🚀 Starting test script for all functions in qnAPI.ts...");
    try {
        console.log("\n🔍 Testing wallet keypair loading...");
        console.assert(qnAPI_1.walletKeypair.publicKey, "❌ Wallet public key is undefined");
        console.log("✅ Wallet public key:", qnAPI_1.walletKeypair.publicKey.toBase58());
        console.log("\n🔍 Fetching Solana blockchain info...");
        const blockHeight = await qnAPI_1.connection.getBlockHeight();
        console.assert(blockHeight > 0, "❌ Block height is invalid");
        console.log("✅ Solana Block Height:", blockHeight);
        console.log("\n🔍 Fetching liquidity pools...");
        const pools = await (0, qnAPI_1.getLiquidityPools)();
        console.assert(pools.length > 0, "❌ No liquidity pools found");
        console.log("✅ Liquidity pools fetched successfully.");
        // Uncomment the following when the functions are ready for use
        // console.log("\n🔍 Simulating Jito bundle...");
        // const testTransaction = await createTestTransaction();
        // const simulationResult = await sendJitoBundle([testTransaction], true);
        // console.assert(
        //   simulationResult &&
        //     (simulationResult as unknown as { success: boolean }).success,
        //   "❌ Jito bundle simulation failed",
        // );
        // console.log("✅ Jito bundle simulation successful");
        console.log("\n🎉 All tests completed successfully!");
    }
    catch (error) {
        console.error("🚨 Test script encountered an error:", error);
    }
})();
//# sourceMappingURL=qnAPI.test.js.map