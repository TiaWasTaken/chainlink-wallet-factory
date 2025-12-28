// src/components/actions/WalletList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import useWalletFactory from "../../hooks/useWalletFactory";
import WalletCard from "./WalletCard";

export default function WalletList({ currentAccount, setActiveWallet }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Carica account da MetaMask
  useEffect(() => {
    async function loadAccounts() {
      if (!window.ethereum) {
        setIsLoadingAccounts(false);
        return;
      }
      try {
        const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
        setAccounts(Array.isArray(accs) ? accs : []);
        setSelectedAccount(accs?.[0] || "");
      } catch (err) {
        console.error("Error loading MetaMask accounts:", err);
      } finally {
        setIsLoadingAccounts(false);
      }
    }

    loadAccounts();

    if (window.ethereum) {
      const handleAccountsChanged = (accs) => {
        setAccounts(accs || []);
        setSelectedAccount(accs?.[0] || "");
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, []);

  const { wallets, isLoading, createWallet } = useWalletFactory(selectedAccount);

  const hasWallets = useMemo(() => Array.isArray(wallets) && wallets.length > 0, [wallets]);

  const isOwnAccount =
    !!currentAccount &&
    !!selectedAccount &&
    selectedAccount.toLowerCase() === currentAccount.toLowerCase();

  if (isLoadingAccounts) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 mt-10 animate-pulse">
        Connecting to MetaMask...
      </div>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-500 mt-10">
        No accounts found. Please connect MetaMask.
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center w-full max-w-5xl px-6"
    >
      <div className="flex justify-between w-full items-center mb-8 flex-wrap gap-3">
        <h3 className="text-2xl font-semibold text-white tracking-tight">
          Wallets & Factory
        </h3>

        <div className="flex items-center gap-3">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
          >
            {accounts.map((acc) => {
              const isCurrent =
                currentAccount && acc?.toLowerCase() === currentAccount.toLowerCase();
              return (
                <option key={acc} value={acc}>
                  {acc.slice(0, 8)}…{acc.slice(-6)}
                  {isCurrent ? " — (you)" : ""}
                </option>
              );
            })}
          </select>

          {isOwnAccount && (
            <button
              onClick={createWallet}
              disabled={isLoading}
              className={`px-6 py-2 rounded-lg font-semibold text-white shadow-sm transition-all duration-300 ${
                isLoading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:scale-[1.02]"
              }`}
            >
              {isLoading ? "Creating..." : "+ Create Wallet"}
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-gray-400 mb-6 animate-pulse">Working on it…</p>}

      {hasWallets ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
          {wallets.map((wallet) => {
            const active =
              !!currentAccount &&
              !!wallet &&
              wallet.toLowerCase() === currentAccount.toLowerCase();

            return (
              <div key={wallet} className={isOwnAccount ? "" : "opacity-70"}>
                <WalletCard
                  walletAddress={wallet}
                  isActive={false} // active qui lo gestiamo “selezione”, non main EOA
                  onSelect={(addr) => {
                    if (!isOwnAccount) return;
                    setActiveWallet?.(addr);
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : (
        !isLoading && (
          <p className="text-gray-500 mt-6 italic">
            No wallets found for this account.
          </p>
        )
      )}
    </motion.div>
  );
}

