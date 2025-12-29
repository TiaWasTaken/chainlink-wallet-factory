import { createWeb3Modal } from "@web3modal/wagmi/react";
import { createConfig, http } from "wagmi";
import { mainnet, sepolia, hardhat } from "wagmi/chains";
import { walletConnect } from "wagmi/connectors";

export const projectId = "c780f10963e6fff133dca98a9ea1dcf3";

export const wagmiConfig = createConfig({
  chains: [hardhat, sepolia, mainnet],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(),
    [mainnet.id]: http()
  },
  connectors: [
    walletConnect({
      projectId,
      showQrModal: false
    })
  ]
});

createWeb3Modal({
  wagmiConfig,
  projectId,
  chains: [hardhat, sepolia, mainnet],
  themeMode: "dark"
});

