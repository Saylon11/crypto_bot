import { fetchTrainingWallets } from "../keys/gcp-service-account";

(async () => {
  const wallets = await fetchTrainingWallets();
  console.log("✅ Wallets fetched from Google Sheet:");
  console.table(wallets);
})();