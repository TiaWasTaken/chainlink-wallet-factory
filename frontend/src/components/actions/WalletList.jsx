// src/components/actions/WalletList.jsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import walletFactoryABI from "../../abi/WalletFactory.json";
import { WALLET_FACTORY_ADDRESS } from "../../config";
import WalletCard from "./WalletCard";
import { motion } from "framer-motion";

export default function WalletList({ account, setActiveWallet }) {
  const [wallets, setWallets] = useState([]);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function fetchWallets() {
      if (!account || !window.ethereum) return;
      try {
        setLoading(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(
          WALLET_FACTORY_ADDRESS,
          walletFactoryABI.abi,
          provider
        );
        const result = await contract.getUserWallets(account);
        setWallets(result);
      } catch (err) {
        console.error("Error fetching wallets:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWallets();
  }, [account]);

  async function createWallet() {
    if (!account || !window.ethereum) return;
    try {
      setCreating(true);
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        WALLET_FACTORY_ADDRESS,
        walletFactoryABI.abi,
        signer
      );

      const tx = await contract.createWallet();
      await tx.wait();

      const updatedWallets = await contract.getUserWallets(account);
      setWallets(updatedWallets);

      window.dispatchEvent(new CustomEvent("toast", { detail: "✅ Wallet created!" }));
    } catch (err) {
      console.error("Error creating wallet:", err);
      window.dispatchEvent(new CustomEvent("toast", { detail: "❌ Error creating wallet" }));
    } finally {
      setCreating(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center w-full max-w-5xl px-6"
    >
      <div className="flex justify-between w-full items-center mb-8">
        <h3 className="text-2xl font-semibold text-white tracking-tight">
          Your Smart Wallets
        </h3>
        <button
          onClick={createWallet}
          disabled={creating}
          className={`px-6 py-2 rounded-lg font-semibold text-white shadow-sm transition-all duration-300 ${
            creating
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
          }`}
        >
          {creating ? "Creating..." : "+ Create Wallet"}
        </button>
      </div>

      {loading && (
        <p className="text-gray-400 mb-6 animate-pulse">Loading wallets...</p>
      )}

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
        {wallets.map((wallet) => (
          <WalletCard
            key={wallet}
            walletAddress={wallet}
            isActive={selectedWallet === wallet}
            onSelect={(addr) => {
              setSelectedWallet(addr);
              setActiveWallet(addr);
              window.dispatchEvent(new CustomEvent("toast", { detail: `✅ Wallet selected: ${addr.slice(0, 8)}...` }));
            }}
          />
        ))}
      </div>

      {!wallets.length && !loading && (
        <p className="text-gray-500 mt-6 italic">
          No wallets found. Create one above to get started.
        </p>
      )}
    </motion.div>
  );
}

