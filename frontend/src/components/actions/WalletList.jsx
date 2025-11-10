// src/components/actions/WalletList.jsx
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import useWalletFactory from "../../hooks/useWalletFactory";

function formatEth(n) {
  if (n === undefined || n === null || isNaN(n)) return "0.0000";
  return Number(n).toFixed(4);
}

export default function WalletList({ account, setActiveWallet }) {
  const { wallets, balances, isLoading, createWallet } = useWalletFactory(account);
  const [selectedWallet, setSelectedWallet] = useState(null);

  const hasWallets = useMemo(() => wallets && wallets.length > 0, [wallets]);
  console.log("🧱 Wallets to display:", wallets);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center w-full max-w-5xl px-6"
    >
      {/* Header */}
      <div className="flex justify-between w-full items-center mb-8">
        <h3 className="text-2xl font-semibold text-white tracking-tight">
          Your Smart Wallets
        </h3>

        <button
          onClick={createWallet}
          disabled={isLoading}
          className={`px-6 py-2 rounded-lg font-semibold text-white shadow-sm transition-all duration-300 ${
            isLoading
              ? "bg-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
          }`}
        >
          {isLoading ? "Creating..." : "+ Create Wallet"}
        </button>
      </div>

      {/* Stato */}
      {isLoading && (
        <p className="text-gray-400 mb-6 animate-pulse">Working on it…</p>
      )}

      {/* Lista */}
      {hasWallets ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
          {wallets.map((wallet) => {
            const isActive = selectedWallet === wallet;
            const bal = formatEth(balances?.[wallet] || 0);

            return (
              <motion.div
                key={wallet}
                whileHover={{ scale: 1.04 }}
                onClick={() => {
                  setSelectedWallet(wallet);
                  setActiveWallet?.(wallet);
                }}
                className={`cursor-pointer border rounded-2xl p-5 transition-all duration-300 flex flex-col items-center text-center ${
                  isActive
                    ? "bg-gradient-to-b from-[#6b3aff]/70 to-[#915eff]/60 border-[#915eff] shadow-[0_0_25px_rgba(145,94,255,0.4)] text-white"
                    : "bg-[#151520]/80 border-[#2b2b3d] text-gray-300 hover:bg-[#1e1e2b]"
                }`}
              >
                <p className="text-[10px] font-mono truncate w-full text-gray-300 mb-2">
                  {wallet}
                </p>
                <p className="text-lg font-semibold">{bal} ETH</p>
              </motion.div>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <p className="text-gray-500 mt-6 italic">
            No wallets found. Create one above to get started.
          </p>
        )
      )}
    </motion.div>
  );
}

