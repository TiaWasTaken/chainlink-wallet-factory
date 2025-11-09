// src/pages/Home.jsx
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import BallSection from "../components/BallSection";
import About from "../components/About";

export default function Home() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    async function loadAccount() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
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
    <div className="min-h-screen bg-[#0f0f1a] text-gray-200 overflow-x-hidden">
      {/* Navbar */}
      <Navbar variant="home" account={account} setAccount={setAccount} />

      {/* Hero section */}
      <Hero />

      <About />

      {/* Interactive 3D balls section */}
      <BallSection />

      {/* Disconnect button (temporaneo) */}
      <div className="flex justify-center py-10">
        <button
          onClick={disconnectWallet}
          className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:scale-105 transition-transform duration-200"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

