import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import WalletList from "../components/WalletList"; // se lo hai già
import SendEth from "../components/SendEth";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [activeWallet, setActiveWallet] = useState(null);

  // ✅ Recupera account MetaMask se già connesso
  useEffect(() => {
    async function loadAccount() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            window.location.replace("/");
          }
        } catch (e) {
          console.error(e);
          window.location.replace("/");
        }
      } else {
        window.location.replace("/");
      }
    }

    loadAccount();

    // 🔁 Aggiorna account in tempo reale
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        console.log("✅ Account switched:", accounts[0]);
        setAccount(accounts[0]);
      } else {
        console.log("⚠️ No account found, redirecting...");
        setAccount(null);
        window.location.replace("/");
      }
    };

    window.ethereum?.on("accountsChanged", handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
    };
  }, []);

  // 🧭 Logout manuale
  function disconnectWallet() {
    try {
      setAccount(null);
      localStorage.clear();
      sessionStorage.clear();
      console.log("🧹 Disconnected & cache cleared");
      window.location.replace("/");
    } catch (err) {
      console.error("❌ Disconnect error:", err);
      window.location.replace("/");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex flex-col items-center text-gray-800 relative overflow-hidden">
      {/* 🔝 Navbar */}
      <Navbar variant="home" account={account} setAccount={setAccount} />

      {/* 🌍 Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 mt-24 px-4 text-center">
        <h2 className="text-4xl font-extrabold mb-4">Welcome back 👋</h2>
        <p className="text-gray-600 mb-8">
          You’re connected with your MetaMask wallet.
        </p>

        {/* Wallet section */}
        <WalletList account={account} setActiveWallet={setActiveWallet} />

        {/* Send ETH */}
        <SendEth activeWallet={activeWallet} />

        {/* 🔴 Disconnect */}
        <button
          onClick={disconnectWallet}
          className="mt-10 px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:scale-105 transition-transform duration-200"
        >
          Disconnect
        </button>
      </main>
    </div>
  );
}

