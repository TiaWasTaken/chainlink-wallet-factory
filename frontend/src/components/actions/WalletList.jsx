import { useEffect, useState } from "react";
import { ethers } from "ethers";
import walletFactoryABI from "../../abi/WalletFactory.json";
import { WALLET_FACTORY_ADDRESS } from "../../config";


export default function WalletList({ account, setActiveWallet }) {
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({});
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // 🧠 Carica i wallet dell'account
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

        // ⚡ Recupera bilanci
        const balancesTemp = {};
        for (const addr of result) {
          const balanceWei = await provider.getBalance(addr);
          balancesTemp[addr] = ethers.formatEther(balanceWei);
        }
        setBalances(balancesTemp);
      } catch (err) {
        console.error("Error fetching wallets:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchWallets();
  }, [account]);

  // 🔁 Aggiorna bilanci ogni 10s
  useEffect(() => {
    if (!wallets.length) return;
    const interval = setInterval(async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const updated = {};
      for (const addr of wallets) {
        const bal = await provider.getBalance(addr);
        updated[addr] = ethers.formatEther(bal);
      }
      setBalances(updated);
    }, 3000);
    return () => clearInterval(interval);
  }, [wallets]);

  // 🏗️ Crea un nuovo wallet
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

      console.log("🚀 Creating new wallet...");
      const tx = await contract.createWallet();
      await tx.wait();

      console.log("✅ Wallet created! Reloading...");
      // Ricarica i wallet dopo la creazione
      const updatedWallets = await contract.getUserWallets(account);
      setWallets(updatedWallets);
    } catch (err) {
      console.error("Error creating wallet:", err);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="flex flex-col items-center mt-10 w-full">
      {/* Header */}
      <div className="flex justify-between w-full max-w-4xl items-center mb-6">
        <h3 className="text-2xl font-semibold text-gray-800">
          Your Smart Wallets
        </h3>

        {/* Pulsante crea wallet */}
        <button
          onClick={createWallet}
          disabled={creating}
          className={`px-5 py-2 rounded-lg font-semibold text-white shadow-sm transition-all duration-200 ${
            creating
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
          }`}
        >
          {creating ? "Creating..." : "+ Create Wallet"}
        </button>
      </div>

      {/* Stato di caricamento */}
      {loading && (
        <p className="text-gray-500 mb-4 animate-pulse">Loading wallets...</p>
      )}

      {/* Lista dei wallet */}
      <div className="flex flex-wrap gap-6 justify-center">
        {wallets.map((wallet) => (
          <div
            key={wallet}
            onClick={() => {
              setActiveWallet(wallet);
              setSelectedWallet(wallet);
            }}
            className={`cursor-pointer px-6 py-4 border rounded-2xl shadow-sm transition-all w-[250px] text-center ${
              selectedWallet === wallet
                ? "bg-purple-100 border-purple-400 scale-105"
                : "bg-white border-gray-200 hover:scale-105"
            }`}
          >
            <p className="text-sm font-mono text-gray-600 break-all mb-2">
              {wallet}
            </p>
            <p className="text-gray-800 font-semibold text-md">
              {balances[wallet]
                ? Number(balances[wallet]).toFixed(4)
                : "0.0000"}{" "}
              ETH
            </p>
          </div>
        ))}
      </div>

      {/* Wallet attivo */}
      {selectedWallet && (
        <p className="mt-6 text-sm text-green-600 font-medium">
          ✅ Active wallet: {selectedWallet}
        </p>
      )}
    </div>
  );
}

