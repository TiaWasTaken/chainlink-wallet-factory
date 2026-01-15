// src/components/actions/WalletCard.jsx
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { motion } from "framer-motion";

import USDCMockABI from "../../abi/USDCMock.json";
import { getAddresses } from "../../config";

const USDC_DECIMALS = 6;

function shortAddr(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

export default function WalletCard({ walletAddress, isActive, onSelect }) {
  const [ethBalance, setEthBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [flipped, setFlipped] = useState(false);
  const [chainId, setChainId] = useState(null);

  const canRead = useMemo(() => !!window.ethereum && !!walletAddress, [walletAddress]);

  // tieni chainId aggiornato (così quando switchi rete non leggi token sbagliato)
  useEffect(() => {
    let alive = true;

    const readChain = async () => {
      if (!window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        if (!alive) return;
        setChainId(Number(net.chainId));
      } catch {
        // noop
      }
    };

    readChain();

    if (!window.ethereum) return;

    const onChainChanged = () => {
      setEthBalance(null);
      setUsdcBalance(null);
      setFlipped(false);
      readChain();
    };

    window.ethereum.on("chainChanged", onChainChanged);
    return () => {
      alive = false;
      window.ethereum.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function fetchBalances() {
      if (!canRead) return;
      if (!chainId) return;

      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const addrs = getAddresses(chainId);

        const usdcAddr = addrs.USDCMock;
        if (!usdcAddr) {
          // se su una chain non hai USDC (o non vuoi), semplicemente mostra null
          const ethWei = await provider.getBalance(walletAddress);
          if (!alive) return;
          setEthBalance(Number(ethers.formatEther(ethWei)));
          setUsdcBalance(null);
          return;
        }

        const usdc = new ethers.Contract(usdcAddr, USDCMockABI.abi, provider);

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
    const id = setInterval(fetchBalances, 10000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [canRead, walletAddress, chainId]);

  const handleClick = () => {
    onSelect?.(walletAddress);
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
            className="absolute inset-0 rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Smart Wallet</p>
                <p className="text-sm font-mono text-gray-200 mt-1 truncate">
                  {shortAddr(walletAddress)}
                </p>
              </div>

              {isActive && (
                <span className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-200">
                  Active
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">ETH Balance</p>
              <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                {ethBalance === null ? "…" : ethBalance.toFixed(4)}{" "}
                <span className="text-base sm:text-lg text-gray-300 font-medium">ETH</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Click to view USDC balance
              </p>
            </div>
          </div>

          {/* BACK */}
          <div
            className="absolute inset-0 rounded-2xl p-4 sm:p-5 flex flex-col justify-between"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-400">USDC Balance</p>
                <p className="text-sm font-mono text-gray-200 mt-1 truncate">
                  {shortAddr(walletAddress)}
                </p>
              </div>

              <span className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-[#1b1b2a] border border-[#2b2b3d] text-gray-300">
                Token
              </span>
            </div>

            <div className="mt-3">
              <p className="text-xs text-gray-400 mb-1">USDC in wallet</p>
              <p className="text-2xl sm:text-3xl font-semibold text-white tracking-tight">
                {usdcBalance === null ? "…" : usdcBalance.toFixed(2)}{" "}
                <span className="text-base sm:text-lg text-gray-300 font-medium">USDC</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">Click to go back</p>
            </div>
          </div>
        </motion.div>

        <div className="pointer-events-none absolute inset-0 rounded-2xl border border-white/5" />
      </motion.div>
    </div>
  );
}

