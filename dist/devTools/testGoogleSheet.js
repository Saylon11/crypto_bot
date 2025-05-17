"use strict";
// src/devTools/testGoogleSheet.ts
Object.defineProperty(exports, "__esModule", { value: true });
const gcp_service_account_1 = require("../keys/gcp-service-account");
(async () => {
    const wallets = await (0, gcp_service_account_1.fetchTrainingWallets)();
    console.log("✅ Wallets fetched from Google Sheet:");
    console.table(wallets);
})();
//# sourceMappingURL=testGoogleSheet.js.map