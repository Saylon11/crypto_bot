import { DevWallet } from "../types";

/**
 * List of known or observed dev wallets for use in the Dev Exhaustion Detector.
 * These wallets are tied to token launches and seeded with initial estimated balances.
 */

export const devWallets: DevWallet[] = [
  {
    address: "HkjUYKyMBrwdLtJdpxa3TbCnGCymP2iEtCMVKtcnhmjK", // Farthouse (Pump.fun)
    initialBalance: 1_000_000
  },
  {
    address: "6LVRtBTmAY7nqyy8YFgAKsKzvZBQq8XECd3K8yEVDp2E", // School (Pump.fun)
    initialBalance: 1_000_000
  },
  {
    address: "G7rbKvSG7vo3P1kLzDbE5RxE8KeatcEzjG4BJ1xAvHMC", // Bull (Pump.fun)
    initialBalance: 1_000_000
  }
];