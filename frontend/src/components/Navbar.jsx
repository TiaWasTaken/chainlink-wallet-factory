// src/components/Navbar.jsx
import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import ethLogo from "../assets/eth_logo.png";

export default function Navbar({ account, setAccount, variant = "home" }) {
  const [balance, setBalance] = useState(null);
  const [avatar, setAvatar] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const dropdownRef = useRef(null);

  // 🎲 Avatar casuale
  useEffect(() => {
    const totalAvatars = 5;
    const randomIndex = Math.floor(Math.random() * totalAvatars) + 1;
    setAvatar(`/avatars/avatar${randomIndex}.png`);
  }, []);

  // 💰 Aggiorna bilancio quando cambia account
  useEffect(() => {
    async function loadBalance() {
      if (account && window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const balanceWei = await provider.getBalance(account);
        setBalance(Number(ethers.formatEther(balanceWei)));
      }
    }
    loadBalance();
  }, [account]);

  // 🔒 Chiudi il menu cliccando fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🚪 Disconnessione
  const disconnectWallet = () => {
    try {
      setShowMenu(false);
      setAccount(null);
      localStorage.clear();
      sessionStorage.clear();

      console.log("🧹 Disconnected & cache cleared");

      // Reindirizza forzatamente
      window.location.href = "/";
    } catch (e) {
      console.error("❌ Disconnect error:", e);
      window.location.href = "/";
    }
  };

  // 🧭 Click logo
  const handleLogoClick = () => {
    if (variant === "home" && account) window.location.href = "/home";
  };

  return (
    <nav className="w-full flex justify-between items-center px-8 py-4 border-b border-gray-200 backdrop-blur-md bg-white/60 shadow-sm fixed top-0 left-0 z-50">
      {/* Logo + nome */}
      <div
        onClick={handleLogoClick}
        className={`flex items-center gap-3 select-none ${
          variant === "home" ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <img
          src={ethLogo}
          alt="ETH"
          className="w-8 h-8 transition-transform hover:scale-110 duration-200"
        />
        <h1 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          EtherConnect
        </h1>
      </div>

      {/* Account info */}
      {variant === "home" && account && (
        <div className="flex items-center gap-5" ref={dropdownRef}>
          {/* Balance */}
          <div className="text-sm text-gray-700 font-medium">
            Ξ {balance ? balance.toFixed(4) : "0.0000"} ETH
          </div>

          {/* Avatar + menu */}
          <div className="relative">
            <img
              src={avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full border-2 border-purple-400 shadow-sm cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setShowMenu(!showMenu)}
            />
            {showMenu && (
              <div className="absolute right-0 top-12 bg-white rounded-xl shadow-lg border border-gray-200 w-56 p-4 z-50">
                <p className="text-sm text-gray-600 mb-2">Connected Wallet</p>
                <p className="text-xs font-mono text-gray-500 break-all">{account}</p>
                <button
                  onClick={disconnectWallet}
                  className="mt-4 w-full bg-red-500 text-white text-sm font-semibold rounded-lg py-2 hover:bg-red-600 transition-all"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

