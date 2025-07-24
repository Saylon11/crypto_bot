export const burnWallets: { address: string; amount: number; date?: string }[] = [
  {
    address: "EoArz3wLPom6GUtdgzLJmMczkC24BNX1j4DGwW4KqJXm",
    amount: 5_000_000,
    date: "2025-05-09",
  },
  // Add future burner entries here
];

export const burnedVaultNFTs: { mint: string; burnedAt: string; reason?: string }[] = [
  // Example entries
  // {
  //   mint: "7s4Uo3FQXbBLv8eayxRvHd1sZPExNq8krX91EGXHyY2P",
  //   burnedAt: "2025-07-13",
  //   reason: "Duplicate Vault NFT with outdated formatting",
  // },
  {
    mint: "2KgZAi7ZCeisEkLCni5pPuGbpf2VMkrNWMgt22Zzhvyq",
    burnedAt: "2025-07-14",
    reason: "Duplicate or legacy Vault NFT burned by script"
  },
  {
    mint: "Fn2My1FYy5fJi7xmg2gWgNUD8M8RnqWpjdpxDBrXmEtC",
    burnedAt: "2025-07-14",
    reason: "Duplicate or legacy Vault NFT burned by script"
  },
];