// src/components/actions/WalletCard.jsx
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";

import USDCMockABI from "../../abi/USDCMock.json";
import addresses from "../../abi/addresses.json";

const USDC_DECIMALS = 6;

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function WalletCard({ walletAddress, isActive, onSelect }) {
  const [ethBalance, setEthBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [flipped, setFlipped] = useState(false);

  const canRead = useMemo(() => !!window.ethereum && !!walletAddress, [walletAddress]);

  useEffect(() => {
    let alive = true;

    async function fetchBalances() {
      if (!canRead) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const usdc = new ethers.Contract(addresses.USDCMock, USDCMockABI.abi, provider);

        const [ethWei, usdcRaw] = await Promise.all([
          provider.getBalance(walletAddress),
          usdc.balanceOf(walletAddress),
        ]);

        if (!alive) return;

        setEthBalance(Number(ethers.formatEther(ethWei)));
        setUsdcBalance(Number(ethers.formatUnits(usdcRaw, USDC_DECIMALS)));
      } catch (e) {
        console.error("WalletCard fetchBalances error:", e);
      }
    }

    fetchBalances();
    const id = setInterval(fetchBalances, 10000); // refresh morbido
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [canRead, walletAddress]);

  const handleClick = () => {
    // Se vuoi anche selezionare il wallet al click: lo facciamo sempre
    onSelect?.(walletAddress);
    // Flip: toggle
    setFlipped((v) => !v);
  };

  const baseBorder = isActive ? "border-purple-400/60" : "border-[#2b2b3d]";
  const baseShadow = isActive
    ? "shadow-[0_0_30px_rgba(168,85,247,0.18)]"
    : "shadow-[0_0_18px_rgba(0,0,0,0.35)]";

  return (
    <div className="w-full">
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleClick}
        className={`relative cursor-pointer rounded-2xl border ${baseBorder} ${baseShadow} bg-[#0f0f1b]/80 backdrop-blur-md`}
        style={{ perspective: 1200 }}
      >
        {/* container flip */}
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="relative rounded-2xl"
          style={{
            transformStyle: "preserve-3d",
            minHeight: 170,
          }}
        >
          {/* FRONT */}
          <div
            className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">Smart Wallet</p>
                <p className="text-sm font-mono text-gray-200 mt-1">
                  {shortAddr(walletAddress)}
                </p>
              </div>

              {isActive && (
                <span className="text-[11px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200">
                  Active
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">ETH Balance</p>
              <p className="text-3xl font-semibold text-white tracking-tight">
                {ethBalance === null ? "…" : ethBalance.toFixed(4)}{" "}
                <span className="text-lg text-gray-300 font-medium">ETH</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Click to view USDC balance
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 rounded-2xl p-5 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400">USDC Balance</p>
                <p className="text-sm font-mono text-gray-200 mt-1">
                  {shortAddr(walletAddress)}
                </p>
              </div>

              <span className="text-[11px] px-2 py-1 rounded-full bg-[#1b1b2a] border border-[#2b2b3d] text-gray-300">
                Token
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">USDC in wallet</p>
              <p className="text-3xl font-semibold text-white tracking-tight">
                {usdcBalance === null ? "…" : usdcBalance.toFixed(2)}{" "}
                <span className="text-lg text-gray-300 font-medium">USDC</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">Click to go back</p>
            </div>
          </div>
        </motion.div>

        {/* subtle glow line (coerente, non “viola pieno”) */}
        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" />
      </motion.div>
    </div>
  );
}

