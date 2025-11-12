import { useEffect, useState, useRef } from "react";
import { ethers } from "ethers";
import ethLogo from "../assets/eth_logo.png";

export default function Navbar({ account, setAccount, variant = "home" }) {
  const [balance, setBalance] = useState(null);
  const [prevBalance, setPrevBalance] = useState(null);
  const [avatar, setAvatar] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const dropdownRef = useRef(null);

  // Avatar random
  useEffect(() => {
    if (!account) return;

    const totalAvatars = 5;
    const randomIndex = Math.floor(Math.random() * totalAvatars) + 1;
    setAvatar(`/avatars/avatar${randomIndex}.png`);
  }, [account]);

  // Aggiorna bilancio
  useEffect(() => {
    if (!account || !window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);

    async function loadBalance() {
      try {
        const balanceWei = await provider.getBalance(account);
        const newBalance = Number(ethers.formatEther(balanceWei));
        setPrevBalance(balance);
        setBalance(newBalance);
      } catch (err) {
        console.error("Error fetching balance:", err);
      }
    }

    loadBalance();
    const interval = setInterval(loadBalance, 3000);
    return () => clearInterval(interval);
  }, [account]);

  // Chiudi menu cliccando fuori
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Logout 
  const disconnectWallet = () => {
    try {
      setShowMenu(false);
      setAccount(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch (e) {
      console.error("Disconnect error:", e);
      window.location.href = "/";
    }
  };

  const handleLogoClick = () => {
    if (variant === "home" && account) window.location.href = "/home";
  };

  const balanceChanged =
    prevBalance !== null && balance !== null && prevBalance !== balance;

  return (
    <nav className="w-full flex justify-between items-center px-8 py-4 fixed top-0 left-0 z-[9999]
      backdrop-blur-xl bg-[#0d0d16]/70 border-b-0
      shadow-[0_4px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/5 rounded-none">
      <div
        onClick={handleLogoClick}
        className={`flex items-center gap-3 select-none ${
          variant === "home" ? "cursor-pointer" : "cursor-default"
        }`}
      >
        <img
          src={ethLogo}
          alt="ETH"
          className="w-8 h-8 transition-transform hover:scale-110 duration-200 drop-shadow-[0_0_6px_#915eff]"
        />
        <h1 className="text-lg font-bold text-white">
          <span className="text-[#915eff]">Ether</span>Connect
        </h1>
      </div>

      {variant === "home" && account && (
        <div className="flex items-center gap-5" ref={dropdownRef}>
          <div
            className={`text-sm font-medium flex items-center gap-1 ${
              balanceChanged
                ? "text-[#915eff] transition-colors"
                : "text-gray-200"
            }`}
          >
            Ξ {balance !== null ? balance.toFixed(4) : "0.0000"} ETH
          </div>

          <div className="relative">
            <img
              src={avatar}
              alt="avatar"
              className="w-10 h-10 rounded-full border-2 border-[#915eff] shadow-[0_0_10px_#915eff] cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setShowMenu(!showMenu)}
            />
            {showMenu && (
              <div className="absolute right-0 top-12 bg-[#141422]/95 rounded-xl shadow-xl border border-[#29293d] w-56 p-4 z-50 backdrop-blur-md">
                <p className="text-sm text-gray-300 mb-2">Connected Wallet</p>
                <p className="text-xs font-mono text-gray-400 break-all">
                  {account}
                </p>
                <button
                  onClick={disconnectWallet}
                  className="mt-4 w-full bg-red-600 text-white text-sm font-semibold rounded-lg py-2 hover:bg-red-700 transition-all"
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

