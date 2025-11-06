// src/components/WalletCard.jsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";

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
    <div
      onClick={() => onSelect(walletAddress)}
      className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center justify-center transition-all duration-200 ${
        isActive ? "bg-purple-100 border-purple-400" : "bg-white hover:bg-gray-100"
      }`}
    >
      <span className="font-mono text-xs break-all text-gray-700">{walletAddress}</span>
      <span className="text-sm text-gray-500 mt-2">{balance} ETH</span>
    </div>
  );
}

