// src/config.js
import addresses from "./abi/addresses.json";

export const WALLET_FACTORY_ADDRESS = addresses.WalletFactory;
export const ORACLE_PRICE_ADDRESS = addresses.OraclePrice;

export const ETHERSCAN_API_KEY = import.meta.env.VITE_ETHERSCAN_API_KEY;
export const ETHERSCAN_API_BASE = "https://api-sepolia.etherscan.io";
export const ETHERSCAN_EXPLORER_BASE = "https://sepolia.etherscan.io";

