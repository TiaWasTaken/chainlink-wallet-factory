import { createWeb3Modal } from "@web3modal/wagmi/react";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { defineChain } from "viem";

export const projectId = "c780f10963e6fff133dca98a9ea1dcf3";

// ✅ Hardhat chain (31337), not wagmi's "localhost" (often 1337)
export const hardhat = defineChain({
  id: 31337,
  name: "Hardhat",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] }
  }
});

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia, mainnet],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(),
    [mainnet.id]: http()
  }
});

createWeb3Modal({
  wagmiConfig,
  projectId,
  chains: [hardhat, sepolia, mainnet],
  themeMode: "dark"
});

