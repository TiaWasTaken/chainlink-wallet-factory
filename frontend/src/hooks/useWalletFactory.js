// src/hooks/useWalletFactory.js
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import factoryAbi from "../abi/WalletFactory.json";
import { WALLET_FACTORY_ADDRESS } from "../config";

export default function useWalletFactory(account) {
  const [wallets, setWallets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Get contract instance
  const getContract = async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(WALLET_FACTORY_ADDRESS, factoryAbi.abi, signer);
  };

  // Fetch all wallets for the connected account
  const fetchWallets = async () => {
    if (!account) return;
    try {
      const contract = await getContract();
      const userWallets = await contract.getUserWallets(account);
      setWallets(userWallets);
    } catch (err) {
      console.error("Error fetching wallets:", err);
    }
  };

  // Create a new wallet
  const createWallet = async () => {
    try {
      setIsLoading(true);
      const contract = await getContract();
      const tx = await contract.createWallet();
      await tx.wait();
      await fetchWallets();
    } catch (err) {
      console.error("Error creating wallet:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, [account]);

  return { wallets, createWallet, isLoading, refresh: fetchWallets };
}

