import { useEffect, useState } from "react";
import { ethers } from "ethers";
import walletFactoryABI from "../abi/WalletFactory.json";
import { WALLET_FACTORY_ADDRESS } from "../config";

export default function WalletList({ account, setActiveWallet }) {
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({});
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🧠 Carica tutti i wallet associati all'account
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

        // ⚡ Per ogni wallet, recupera il balance
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

  // 🧩 Aggiorna il balance in tempo reale (ogni 10 secondi)
  useEffect(() => {
    if (!wallets.length) return;
    const interval = setInterval(async () => {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const updatedBalances = {};
      for (const addr of wallets) {
        const bal = await provider.getBalance(addr);
        updatedBalances[addr] = ethers.formatEther(bal);
      }
      setBalances(updatedBalances);
    }, 10000);
    return () => clearInterval(interval);
  }, [wallets]);

  return (
    <div className="flex flex-col items-center mt-10">
      <h3 className="text-2xl font-semibold mb-6 text-gray-800">
        Your Smart Wallets
      </h3>

      {loading && <p className="text-gray-500 mb-4">Loading wallets...</p>}

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

      {selectedWallet && (
        <p className="mt-6 text-sm text-green-600 font-medium">
          ✅ Active wallet: {selectedWallet}
        </p>
      )}
    </div>
  );
}

