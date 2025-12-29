import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useChainId } from "wagmi";

export default function Login() {
  const navigate = useNavigate();
  const { open } = useWeb3Modal();

  // wagmi status evita il "flash" quando auto-ripristina la sessione
  const { address, isConnected, status } = useAccount();
  const chainId = useChainId();

  const [error, setError] = useState("");

  const isHardhat = useMemo(() => chainId === 31337, [chainId]);

  useEffect(() => {
    if (isConnected) {
      navigate("/home", { replace: true });
    }
  }, [isConnected, navigate]);

  async function connectWallet() {
    try {
      setError("");
      await open();
    } catch (err) {
      console.error(err);
      setError("Connection failed or denied.");
    }
  }

  // ✅ Evita che la Login lampeggi per 1 secondo mentre wagmi "reconnecting"
  if (status === "reconnecting" || status === "connecting") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0e001a] via-[#15002b] to-[#220044] text-gray-100">
        <div className="text-sm text-gray-300">Restoring session…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#0e001a] via-[#15002b] to-[#220044] text-gray-100 relative overflow-hidden">
      <Navbar variant="login" />

      <div className="absolute w-[600px] h-[600px] bg-purple-400/20 rounded-full blur-3xl top-1/3 -left-1/3" />
      <div className="absolute w-[600px] h-[600px] bg-fuchsia-400/20 rounded-full blur-3xl bottom-1/3 -right-1/3" />

      <div className="relative mb-10 mt-10 animate-float select-none">
        <img
          src="/icons/eth_logo.png"
          alt="Ethereum Logo"
          className="w-52 h-52 drop-shadow-[0_0_30px_rgba(164,99,255,0.5)]"
        />
      </div>

      <h1 className="text-5xl font-extrabold mb-3 text-white text-center">
        Connect Your Wallet
      </h1>

      <p className="text-gray-400 mb-8 text-center max-w-md">
        Access your dashboard securely with{" "}
        <span className="text-purple-400 font-semibold">MetaMask</span>. Your
        gateway to the decentralized web.
      </p>

      <button
        onClick={connectWallet}
        className="relative group flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-purple-400/50 hover:scale-105 transition-transform duration-300 overflow-hidden"
      >
        <img
          src="/icons/metamask.svg"
          alt="MetaMask Icon"
          className="w-6 h-6 relative mr-2 -ml-2 z-10"
        />
        <span className="relative z-10">Connect Wallet</span>
        <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-600 opacity-0 group-hover:opacity-30 blur-lg transition-opacity duration-300" />
      </button>

      {isConnected && address && (
        <p className="mt-6 text-sm text-green-400 font-medium">
          ✅ Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </p>
      )}

      {error && (
        <p className="mt-6 text-sm text-red-400 text-center max-w-xs">
          {error}
        </p>
      )}

      <p className="text-sm text-gray-500 mt-8 text-center max-w-md mb-6">
        Having issues? Ensure your{" "}
        <span className="text-purple-400 font-medium">Hardhat node</span> is
        running and{" "}
        <span className="text-purple-400 font-medium">
          {isHardhat ? "Hardhat" : "the correct network"}
        </span>{" "}
        is selected.
      </p>

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-12px);
          }
          100% {
            transform: translateY(0px);
          }
        }
        .animate-float {
          animation: float 4.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

