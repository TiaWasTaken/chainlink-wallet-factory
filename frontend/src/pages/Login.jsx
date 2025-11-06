import { useState } from "react";
import EthereumLogo from "../canva/EthereumLogo";

export default function Login() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState("");

  // 🦊 Funzione per connettersi a MetaMask
  async function connectWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("⚠️ Please install MetaMask to continue.");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      setAccount(accounts[0]);
      setError("");

      // ✅ Redirect automatico alla Home dopo 1s
      setTimeout(() => {
        window.location.href = "/home";
      }, 1000);
    } catch (err) {
      console.error(err);
      setError("❌ Connection failed or denied.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-900 relative overflow-hidden">
      {/* 🔮 Glow dietro */}
      <div className="absolute w-[600px] h-[600px] bg-purple-300/20 rounded-full blur-3xl top-1/3 -left-1/3" />
      <div className="absolute w-[600px] h-[600px] bg-fuchsia-300/20 rounded-full blur-3xl bottom-1/3 -right-1/3" />

      {/* 💠 Ethereum 3D logo */}
      <div className="relative h-64 w-64 mb-10 z-10">
        <div className="absolute inset-0 blur-[80px] bg-purple-400/20 rounded-full" />
        <EthereumLogo />
      </div>

      {/* Titolo */}
      <h1 className="mt-8 text-5xl font-extrabold mb-3 text-gray-800 z-10">
        Connect Your Account
      </h1>

      {/* Sottotitolo */}
      <p className="text-gray-600 mb-8 text-center max-w-md z-10">
        Once you connect a <span className="font-bold">MetaMask Account</span>,
        you’ll be redirected to the home page.
      </p>

      {/* Pulsante */}
      <button
        onClick={connectWallet}
        className="relative group px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-purple-300/50 hover:scale-105 transition-transform duration-300 overflow-hidden z-10"
      >
        <span className="relative z-10">🦊 Connect MetaMask</span>
        <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-600 opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-300" />
      </button>

      {/* Stato dinamico */}
      {account && (
        <p className="mt-6 text-sm text-green-600 font-medium z-10">
          ✅ Connected: {account.slice(0, 6)}...{account.slice(-4)}
        </p>
      )}
      {error && (
        <p className="mt-6 text-sm text-red-500 text-center max-w-xs z-10">
          {error}
        </p>
      )}

      {/* Footer */}
      <p className="text-sm text-gray-500 mt-8 text-center max-w-md z-10">
        Problems with MetaMask? Make sure your local node (Hardhat) is running and the{" "}
        <b>Hardhat Localhost</b> network is selected.
      </p>
    </div>
  );
}

