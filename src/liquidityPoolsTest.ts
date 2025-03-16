import dotenv from "dotenv";
dotenv.config();

import { getLiquidityPools } from "./qnAPI";

(async () => {
  const pools = await getLiquidityPools();
  if (pools && pools.length) {
    console.log(`✅ Test Passed — Retrieved ${pools.length} liquidity pools.`);
  } else {
    console.error("⚠️ No liquidity pools retrieved or an error occurred.");
  }
})();