// src/components/actions/WalletList.jsx
import React, { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import useWalletFactory from "../../hooks/useWalletFactory";

function formatEth(n) {
  if (n === undefined || n === null || isNaN(n)) return "0.0000";
  return Number(n).toFixed(4);
}

export default function WalletList({ currentAccount, setActiveWallet }) {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // Carica gli account da MetaMask
  useEffect(() => {
    async function loadAccounts() {
      if (!window.ethereum) {
        console.warn("MetaMask not detected");
        setIsLoadingAccounts(false);
        return;
      }
      try {
        const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
        if (Array.isArray(accs) && accs.length > 0) {
          setAccounts(accs);
          setSelectedAccount(accs[0]);
        } else {
          console.warn("No accounts returned from MetaMask");
          setAccounts([]);
        }
      } catch (err) {
        console.error("Error loading MetaMask accounts:", err);
      } finally {
        setIsLoadingAccounts(false);
      }
    }

    loadAccounts();

    // aggiorna dinamicamente quando cambia l’account in MetaMask
    if (window.ethereum) {
      const handleAccountsChanged = (accs) => {
        console.log("MetaMask account changed:", accs);
        setAccounts(accs || []);
        if (accs && accs.length > 0) setSelectedAccount(accs[0]);
      };
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, []);

  // Hook: mostra i wallet relativi all’account selezionato
  const { wallets, balances, isLoading, createWallet } = useWalletFactory(selectedAccount);
  const hasWallets = useMemo(() => wallets && wallets.length > 0, [wallets]);
  const isOwnAccount =
    currentAccount && selectedAccount?.toLowerCase() === currentAccount?.toLowerCase();

  // Gestione stati iniziali
  if (isLoadingAccounts) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 mt-10 animate-pulse">
        🔄 Connecting to MetaMask...
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
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center w-full max-w-5xl px-6"
    >
      <div className="flex justify-between w-full items-center mb-8 flex-wrap gap-3">
        <h3 className="text-2xl font-semibold text-white tracking-tight">
          Your Smart Wallets
        </h3>

        <div className="flex items-center gap-3">
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className="bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
          >
            {accounts.map((acc) => {
              const isCurrent =
                currentAccount && acc?.toLowerCase() === currentAccount?.toLowerCase();

              return (
                <option
                  key={acc}
                  value={acc}
                  className={isCurrent ? "text-purple-400 font-semibold" : ""}
                >
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
                  ? "bg-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
              }`}
            >
              {isLoading ? "Creating..." : "+ Create Wallet"}
            </button>
          )}
        </div>
      </div>

      {isLoading && (
        <p className="text-gray-400 mb-6 animate-pulse">Working on it…</p>
      )}

      {hasWallets ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 w-full">
          {wallets.map((wallet) => {
            const bal = formatEth(balances?.[wallet] || 0);
            const isDisabled = !isOwnAccount;

            return (
              <motion.div
                key={wallet}
                whileHover={!isDisabled ? { scale: 1.04 } : {}}
                onClick={() => {
                  if (!isDisabled) setActiveWallet?.(wallet);
                }}
                className={`border rounded-2xl p-5 transition-all duration-300 flex flex-col items-center text-center ${
                  isDisabled
                    ? "bg-[#14141c]/70 border-[#2b2b3d] text-gray-500 cursor-not-allowed opacity-70"
                    : "cursor-pointer bg-[#151520]/80 border-[#2b2b3d] text-gray-200 hover:border-[#915eff]/40 hover:shadow-[0_0_20px_rgba(145,94,255,0.2)]"
                }`}
              >
                <p className="text-[10px] font-mono truncate w-full text-gray-400 mb-2">
                  {wallet}
                </p>
                <p className="text-lg font-semibold">{bal} ETH</p>
                {!isDisabled && (
                  <p className="text-xs text-purple-400 mt-1">Active</p>
                )}
              </motion.div>
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

