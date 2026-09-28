
import addressesByChain from "./abi/addresses.json";


export function getAddresses(chainId) {
  const key = String(chainId ?? "");
  const cfg = addressesByChain[key];

  if (!cfg) {
    throw new Error(
      `Unsupported network: chainId=${chainId}. Missing addresses entry in src/abi/addresses.json`
    );
  }

  return cfg;
}


export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
export const ETHERSCAN_API_BASE = "https://api-sepolia.etherscan.io";
export const ETHERSCAN_EXPLORER_BASE = "https://sepolia.etherscan.io";

