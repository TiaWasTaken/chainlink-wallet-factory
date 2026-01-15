// frontend/src/web3/walletConnect.js
import { createWeb3Modal } from "@web3modal/wagmi/react";
import { createConfig, http } from "wagmi";
import { sepolia, hardhat } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

export const projectId = "c780f10963e6fff133dca98a9ea1dcf3";

// ✅ sempre le stesse chains (evita che wagmi “impazzisca” tra refresh / route)
const chains = [hardhat, sepolia];

// ✅ RPC Sepolia: metti la tua Alchemy/Infura URL qui oppure meglio in .env (vedi nota sotto)
const SEPOLIA_RPC_URL =
  import.meta.env.VITE_SEPOLIA_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/PASTE_KEY";

export const wagmiConfig = createConfig({
  chains,
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(SEPOLIA_RPC_URL),
  },
  connectors: [
    // ✅ MetaMask / Injected (desktop) — fondamentale per hardhat
    injected({ shimDisconnect: true }),

    // ✅ WalletConnect (mobile)
    walletConnect({
      projectId,
      showQrModal: false,
    }),
  ],
});

createWeb3Modal({
  wagmiConfig,
  projectId,
  chains,
  themeMode: "dark",
  enableAnalytics: false,
});

