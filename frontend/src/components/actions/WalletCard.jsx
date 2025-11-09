// src/components/actions/WalletCard.jsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";

export default function WalletCard({ walletAddress, isActive, onSelect }) {
  const [balance, setBalance] = useState("0.0");

  useEffect(() => {
    async function fetchBalance() {
      if (!window.ethereum || !walletAddress) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balanceWei = await provider.getBalance(walletAddress);
        setBalance(Number(ethers.formatEther(balanceWei)).toFixed(4));
      } catch (e) {
        console.error("Error fetching balance:", e);
      }
    }
    fetchBalance();
  }, [walletAddress]);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(walletAddress)}
      className={`relative cursor-pointer p-5 rounded-2xl border transition-all duration-300 text-center backdrop-blur-sm ${
        isActive
          ? "bg-gradient-to-b from-[#6b3aff]/70 to-[#915eff]/70 border-[#915eff] shadow-[0_0_25px_rgba(145,94,255,0.4)]"
          : "bg-[#151520]/80 border-[#2b2b3d] hover:border-[#915eff]/40 hover:shadow-[0_0_20px_rgba(145,94,255,0.2)]"
      }`}
    >
      <p className="text-xs font-mono break-all text-gray-300 mb-2">
        {walletAddress}
      </p>
      <p className="text-lg font-semibold text-white">{balance} ETH</p>

      {isActive && (
        <motion.div
          layoutId="activeGlow"
          className="absolute inset-0 rounded-2xl border-2 border-[#b191ff]/60 shadow-[0_0_30px_rgba(145,94,255,0.3)] pointer-events-none"
        />
      )}
    </motion.div>
  );
}

