// src/components/actions/WalletList.jsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import useWalletFactory from "../../hooks/useWalletFactory";
import WalletCard from "./WalletCard";

export default function WalletList({ currentAccount, setActiveWallet }) {
  const [accounts, setAccounts] = useState([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);

  // “requestedAccount” = quello che l’utente seleziona nel dropdown (per view/filtri)
  const [requestedAccount, setRequestedAccount] = useState("");
  const [switchHint, setSwitchHint] = useState("");

  const hasProvider = typeof window !== "undefined" && !!window.ethereum;

  const loadAccounts = useCallback(async () => {
    if (!hasProvider) {
      setIsLoadingAccounts(false);
      return;
    }

    try {
      // passivo: NON forza popup
      const accs = await window.ethereum.request({ method: "eth_accounts" });
      const list = Array.isArray(accs) ? accs : [];
      setAccounts(list);

      // se non ho ancora un requestedAccount, usa currentAccount o accs[0]
      setRequestedAccount((prev) => prev || currentAccount || list[0] || "");
    } catch (err) {
      console.error("Error loading MetaMask accounts:", err);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [hasProvider, currentAccount]);

  // Init + listeners
  useEffect(() => {
    loadAccounts();
    if (!hasProvider) return;

    const handleAccountsChanged = (accs) => {
      const next = Array.isArray(accs) ? accs : [];
      setAccounts(next);

      // MetaMask ha cambiato DAVVERO account attivo => reset hint e riallinea selection
      setSwitchHint("");
      setRequestedAccount(next[0] || "");
      setActiveWallet?.(null);
    };

    const handleChainChanged = () => {
      // rete cambiata => reset selezioni “fantasma”
      setSwitchHint("");
      setActiveWallet?.(null);
      // ricarica accounts
      loadAccounts();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
  }, [hasProvider, loadAccounts, setActiveWallet]);

  // Se arriva currentAccount dal parent (account realmente attivo), aggiorna selection di default
  useEffect(() => {
    if (currentAccount) {
      setRequestedAccount((prev) => prev || currentAccount);
    }
  }, [currentAccount]);

  const isConnected = !!currentAccount;

  // se alcuni wallet non ritornano la lista accounts, fallback
  const accountOptions = accounts?.length ? accounts : (currentAccount ? [currentAccount] : []);

  const selected = requestedAccount || currentAccount || "";

  const isOwnAccount =
    !!selected &&
    !!currentAccount &&
    selected.toLowerCase() === currentAccount.toLowerCase();

  // Hook: deve seguire l’account selezionato per VISUALIZZARE wallets di quell’utente
  // (firma/transazioni rimangono sull’account attivo in MetaMask)
  const { wallets, isBusy, createWallet } = useWalletFactory(selected);

  const hasWallets = useMemo(
    () => Array.isArray(wallets) && wallets.length > 0,
    [wallets]
  );

  const connect = async () => {
    if (!hasProvider) return;
    setSwitchHint("");

    try {
      const accs = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const list = Array.isArray(accs) ? accs : [];
      setAccounts(list);

      // MetaMask imposta accs[0] come attivo
      setRequestedAccount(list[0] || "");
    } catch (e) {
      console.warn("Connect canceled:", e?.message);
    }
  };

  const onSelectAccount = (targetAccount) => {
    setRequestedAccount(targetAccount);
    setActiveWallet?.(null);

    // Non possiamo forzare lo switch attivo: quindi mostriamo hint se target != active
    if (currentAccount && targetAccount) {
      if (targetAccount.toLowerCase() !== currentAccount.toLowerCase()) {
        setSwitchHint(
          "Stai visualizzando un account diverso. Per firmare (Create/Send/Swap) devi rendere quell’account attivo in MetaMask."
        );
      } else {
        setSwitchHint("");
      }
    }
  };

  if (isLoadingAccounts) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-400 mt-10 animate-pulse px-4">
        Connecting to MetaMask...
      </div>
    );
  }

  if (!hasProvider) {
    return (
      <div className="flex flex-col items-center justify-center text-gray-500 mt-10 px-4 text-center">
        MetaMask not found. Please install it to use the dApp.
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center mt-10 px-4 text-center w-full">
        <p className="text-gray-400 mb-4">Wallet not connected.</p>
        <button
          onClick={connect}
          className="w-full max-w-sm px-6 py-3 rounded-xl font-semibold text-white shadow-sm transition-all duration-300 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:scale-[1.01]"
        >
          Connect MetaMask
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col items-center w-full max-w-5xl px-4 sm:px-6"
    >
      {/* HEADER */}
      <div className="w-full mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <h3 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            Wallets & Factory
          </h3>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <select
              value={selected}
              onChange={(e) => onSelectAccount(e.target.value)}
              className="w-full sm:w-auto bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            >
              {accountOptions.map((acc) => {
                const isCurrent =
                  currentAccount &&
                  acc?.toLowerCase() === currentAccount.toLowerCase();
                return (
                  <option key={acc} value={acc}>
                    {acc.slice(0, 8)}…{acc.slice(-6)}
                    {isCurrent ? " — (active)" : ""}
                  </option>
                );
              })}
            </select>

            <button
              onClick={createWallet}
              disabled={isBusy || !isOwnAccount}
              className={`w-full sm:w-auto px-6 py-2 rounded-lg font-semibold text-white shadow-sm transition-all duration-300 ${
                isBusy || !isOwnAccount
                  ? "bg-gray-600 cursor-not-allowed opacity-70"
                  : "bg-gradient-to-r from-purple-600/90 to-indigo-600/90 hover:scale-[1.02]"
              }`}
              title={
                isOwnAccount
                  ? "Create a Smart Wallet"
                  : "Per creare/firmare devi essere sull’account attivo in MetaMask"
              }
            >
              {isBusy ? "Creating..." : "+ Create Wallet"}
            </button>
          </div>
        </div>

        {/* HINT */}
        {switchHint && (
          <p className="mt-3 text-sm text-amber-200/90">{switchHint}</p>
        )}

        {!isOwnAccount && selected && (
          <p className="mt-3 text-sm text-gray-400">
            Stai visualizzando{" "}
            <span className="text-gray-200 font-mono">
              {selected.slice(0, 8)}…
            </span>
            , ma l’account attivo in MetaMask è{" "}
            <span className="text-gray-200 font-mono">
              {currentAccount.slice(0, 8)}…
            </span>
            . Per firmare devi switchare da MetaMask.
          </p>
        )}
      </div>

      {/* SLOT fisso per evitare layout shift */}
      <div className="min-h-[24px] w-full mb-4">
        {isBusy && (
          <p className="text-gray-400 animate-pulse text-sm">Working on it…</p>
        )}
      </div>

      {/* LISTA WALLET */}
      {hasWallets ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
          {wallets.map((wallet) => (
            <div key={wallet} className={isOwnAccount ? "" : "opacity-80"}>
              <WalletCard
                walletAddress={wallet}
                isActive={false}
                onSelect={(addr) => {
                  // selezione wallet solo se l’account selezionato è quello attivo
                  if (!isOwnAccount) return;
                  setActiveWallet?.(addr);
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 mt-6 italic text-center px-4">
          No wallets found for this account on the current network.
        </p>
      )}
    </motion.div>
  );
}

