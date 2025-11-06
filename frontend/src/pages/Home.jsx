import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import WalletList from "../components/WalletList";
import SendEth from "../components/SendEth";

export default function Home() {
  const [account, setAccount] = useState(null);
  const [activeWallet, setActiveWallet] = useState(null);

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex flex-col text-gray-800 relative overflow-hidden">
      <Navbar variant="home" account={account} setAccount={setAccount} />

      {/* 🌈 Background effects */}
      <div className="absolute w-[600px] h-[600px] bg-purple-300/20 rounded-full blur-3xl top-1/3 -left-1/3" />
      <div className="absolute w-[600px] h-[600px] bg-fuchsia-300/20 rounded-full blur-3xl bottom-1/3 -right-1/3" />

      <main className="flex flex-col items-center justify-start flex-1 mt-28 px-6 z-10">
        {/* Hero section */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-extrabold mb-2 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Welcome back 👋
          </h2>
          <p className="text-gray-600 text-lg">
            You’re connected with your MetaMask wallet.
          </p>
        </div>

        {/* Wallet list */}
        <section className="w-full max-w-5xl flex flex-col items-center mb-12">
          <WalletList account={account} setActiveWallet={setActiveWallet} />
        </section>

        {/* Send ETH */}
        <section className="w-full flex justify-center">
          <SendEth activeWallet={activeWallet} />
        </section>

        {/* Disconnect */}
        <button
          onClick={disconnectWallet}
          className="mt-14 mb-8 px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:scale-105 transition-transform duration-200"
        >
          Disconnect
        </button>
      </main>
    </div>
  );
}

