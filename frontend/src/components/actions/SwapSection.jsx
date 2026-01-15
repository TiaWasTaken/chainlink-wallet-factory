// src/components/actions/SwapSection.jsx
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { useAccount, useChainId } from "wagmi";

import { useSwap } from "../../hooks/useSwap";
import useLocalTxHistory from "../../hooks/useLocalTxHistory";
import useWalletFactory from "../../hooks/useWalletFactory";

import { Repeat, Loader2, Wallet2, ArrowLeftRight, Clock3 } from "lucide-react";

const USDC_DECIMALS = 6;
const REFRESH_MS = 10_000;

const fmtNum = (val, digits = 2) => {
  if (val === null || val === undefined) return "…";
  const n = Number(val);
  if (!Number.isFinite(n)) return "…";
  return n.toFixed(digits);
};

export default function SwapSection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // UI state
  const [mode, setMode] = useState("buy"); // "buy" | "sell"
  const [ethToSpend, setEthToSpend] = useState("");
  const [usdcToSell, setUsdcToSell] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  // tx status UI
  const [txStatus, setTxStatus] = useState(null); // null | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const { addTx } = useLocalTxHistory();

  // Wallet list (SmartWallets)
  const { wallets: smartWallets, refresh: refreshWallets } = useWalletFactory(
    address || ""
  );

  // active wallet for balances + swap source
  const activeWallet = useMemo(
    () => (selectedWallet ? selectedWallet : address),
    [selectedWallet, address]
  );

  // Swap hook (chain-aware)
  const {
    loading,
    txPending,
    error,
    missingConfig,

    eoaAddress,
    activeAddress,
    isSmartWallet,

    ethBalance, // BigInt (wei)
    usdcBalance, // BigInt (6 decimals)
    ethUsdPrice, // number
    ethToUsdcRate, // number

    buyUsdc,
    sellUsdc,
    refresh,
    addresses,
  } = useSwap(activeWallet);

  const ethBalanceNum = useMemo(() => {
    if (ethBalance === null || ethBalance === undefined) return null;
    try {
      return Number(ethers.formatEther(ethBalance));
    } catch {
      return null;
    }
  }, [ethBalance]);

  const usdcBalanceNum = useMemo(() => {
    if (usdcBalance === null || usdcBalance === undefined) return null;
    try {
      return Number(ethers.formatUnits(usdcBalance, USDC_DECIMALS));
    } catch {
      return null;
    }
  }, [usdcBalance]);

  const usdcToEthRate = useMemo(() => {
    if (!ethToUsdcRate || ethToUsdcRate <= 0) return null;
    return 1 / ethToUsdcRate;
  }, [ethToUsdcRate]);

  const networkName = useMemo(() => {
    if (!chainId) return "Loading...";
    if (chainId === 31337) return "Hardhat Localhost";
    if (chainId === 11155111) return "Sepolia Testnet";
    if (chainId === 1) return "Ethereum Mainnet";
    return `Chain ${chainId}`;
  }, [chainId]);

  // refresh smart wallets when account changes
  useEffect(() => {
    refreshWallets?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // periodic refresh (balances + rates)
  useEffect(() => {
    if (!isConnected || missingConfig || !refresh) return;

    refresh();
    setLastUpdated(new Date());

    const id = setInterval(async () => {
      await refresh();
      setLastUpdated(new Date());
    }, REFRESH_MS);

    return () => clearInterval(id);
  }, [isConnected, missingConfig, refresh]);

  // --- previews ---
  const estimatedUsdcOut = useMemo(() => {
    if (!ethUsdPrice) return "…";
    const n = Number(ethToSpend);
    if (!Number.isFinite(n) || n <= 0) return "…";
    return fmtNum(n * ethUsdPrice, 2);
  }, [ethToSpend, ethUsdPrice]);

  const estimatedEthOut = useMemo(() => {
    if (!ethUsdPrice) return "…";
    const n = Number(usdcToSell);
    if (!Number.isFinite(n) || n <= 0) return "…";
    return fmtNum(n / ethUsdPrice, 6);
  }, [usdcToSell, ethUsdPrice]);

  const handleMaxEth = () => {
    if (ethBalanceNum === null) return;
    // non vogliamo mettere 100% balance perché servono fee
    const safe = Math.max(0, ethBalanceNum - 0.002);
    setEthToSpend(safe > 0 ? safe.toFixed(4) : "0");
  };

  const handleMaxUsdc = () => {
    if (usdcBalanceNum === null) return;
    setUsdcToSell(usdcBalanceNum.toFixed(2));
  };

  // --- actions ---
  const handleBuyUsdc = async () => {
    if (missingConfig) return;
    const n = Number(ethToSpend);
    if (!Number.isFinite(n) || n <= 0) return;

    try {
      setTxStatus(null);
      setErrorMessage("");

      const res = await buyUsdc(ethToSpend);
      const tx = res?.tx;

      setTxStatus("success");
      setEthToSpend("");

      if (tx?.hash && eoaAddress) {
        addTx({
          hash: tx.hash,
          from: eoaAddress,
          to: isSmartWallet ? activeAddress : (addresses?.EthUsdcSwap || "swap"),
          amount: ethToSpend,
          timestamp: new Date().toISOString(),
          status: "success",
          type: isSmartWallet ? "BUY_USDC_SMARTWALLET" : "BUY_USDC_MAIN",
          recipient: activeAddress,
        });
      }

      await refresh?.();
    } catch (e) {
      setTxStatus("error");
      setErrorMessage(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  const handleSellUsdc = async () => {
    if (missingConfig) return;
    const n = Number(usdcToSell);
    if (!Number.isFinite(n) || n <= 0) return;

    try {
      setTxStatus(null);
      setErrorMessage("");

      const res = await sellUsdc(usdcToSell);
      const tx = res?.tx;

      setTxStatus("success");
      setUsdcToSell("");

      if (tx?.hash && eoaAddress) {
        addTx({
          hash: tx.hash,
          from: eoaAddress,
          to: isSmartWallet ? activeAddress : (addresses?.EthUsdcSwap || "swap"),
          amount: usdcToSell,
          timestamp: new Date().toISOString(),
          status: "success",
          type: isSmartWallet ? "SELL_USDC_SMARTWALLET" : "SELL_USDC_MAIN",
          recipient: activeAddress,
        });
      }

      await refresh?.();
    } catch (e) {
      setTxStatus("error");
      setErrorMessage(e?.shortMessage || e?.message || "Transaction failed");
    }
  };

  // ---------- guards ----------
  if (!window.ethereum) {
    return (
      <div className="mt-10 p-6 bg-[#151520]/80 border border-[#2b2b3d] rounded-2xl text-center text-gray-300 w-full max-w-xl mx-auto">
        <p>You need MetaMask (or another Ethereum provider) to use the swap.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mt-10 p-6 bg-[#151520]/80 border border-[#2b2b3d] rounded-2xl text-center text-gray-300 w-full max-w-xl mx-auto">
        <p className="font-semibold">Wallet not connected.</p>
        <p className="text-sm mt-2">Connect your wallet to use the swap.</p>
      </div>
    );
  }

  if (missingConfig && !loading) {
    return (
      <div className="mt-10 p-6 bg-[#151520]/80 border border-red-500/20 rounded-2xl text-center text-red-200 w-full max-w-xl mx-auto">
        <p className="font-semibold">Swap not available on this network.</p>
        <p className="text-sm mt-2">{missingConfig}</p>
        <p className="text-xs text-red-300 mt-3">
          Chain: {networkName} (chainId: {String(chainId)})
        </p>
      </div>
    );
  }

  // ---------- UI ----------
  return (
    <div className="bg-[#0b0b15] border border-[#1f1f2d] rounded-2xl p-4 sm:p-6 w-full max-w-4xl mx-auto shadow-lg text-white">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Repeat className="text-purple-400 mt-1" />
          <div>
            <h2 className="text-lg sm:text-xl font-semibold">
              Token Swap (ETH ⇄ USDC)
            </h2>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-2">
              <Wallet2 size={14} className="text-purple-400" />
              {address ? (
                <>
                  Connected:&nbsp;
                  <span className="text-gray-200">
                    {address.slice(0, 8)}…{address.slice(-6)}
                  </span>
                </>
              ) : (
                "Connecting wallet..."
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 justify-start sm:justify-end">
          <span className="text-[11px] text-gray-300 bg-[#1f1f2d] px-2 py-1 rounded">
            {networkName}
          </span>
          <span className="text-[11px] text-gray-400 bg-[#1b1b2a] border border-[#2b2b3d] px-2 py-1 rounded">
            Chain ID: {String(chainId ?? "…")}
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1 px-2 py-1">
            <Clock3 size={12} className="text-purple-400" />
            Refresh ~{REFRESH_MS / 1000}s
            <span className="text-gray-500">
              {lastUpdated
                ? `  ${lastUpdated.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}`
                : ""}
            </span>
          </span>
        </div>
      </div>

      {/* Active wallet */}
      <div className="mt-4">
        <label className="text-xs text-gray-400 mb-1 block">
          Active wallet (balances + swap source)
        </label>
        <select
          value={activeWallet || ""}
          onChange={(e) => setSelectedWallet(e.target.value)}
          className="w-full px-3 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
        >
          {address && (
            <option value={address}>
              {address.slice(0, 8)}…{address.slice(-6)} — Main Account
            </option>
          )}
          {smartWallets.map((w) => (
            <option key={w} value={w}>
              {w.slice(0, 10)}…{w.slice(-8)} — Smart Wallet
            </option>
          ))}
        </select>

        <p className="text-xs text-gray-500 mt-2">
          Using:{" "}
          <span className="text-gray-200 font-mono">
            {activeAddress ? `${activeAddress.slice(0, 10)}…${activeAddress.slice(-8)}` : "…"}
          </span>{" "}
          {isSmartWallet ? "(Smart Wallet)" : "(Main)"}
        </p>
      </div>

      {/* Balances */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-[#141421] rounded-xl p-4 border border-[#1f1f2d]">
          <p className="text-xs text-gray-400">ETH balance</p>
          <p className="text-2xl font-semibold mt-1">
            {fmtNum(ethBalanceNum, 4)} <span className="text-base text-gray-300">ETH</span>
          </p>
        </div>

        <div className="bg-[#141421] rounded-xl p-4 border border-[#1f1f2d]">
          <p className="text-xs text-gray-400">USDC balance</p>
          <p className="text-2xl font-semibold mt-1">
            {fmtNum(usdcBalanceNum, 2)} <span className="text-base text-gray-300">USDC</span>
          </p>
        </div>
      </div>

      {/* Rates (simple) */}
      <div className="mt-3 bg-[#141421] rounded-xl p-4 border border-[#1f1f2d]">
        <p className="text-xs text-gray-400 flex items-center gap-2">
          <ArrowLeftRight size={14} className="text-purple-400" />
          Rates
        </p>

        <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="text-sm text-gray-200">
            ETH/USD:&nbsp;
            <span className="font-semibold text-white">
              {fmtNum(ethUsdPrice, 2)} $
            </span>
          </div>

          <div className="text-sm text-gray-300 flex flex-wrap gap-x-4 gap-y-1">
            <span>
              1 ETH ≈{" "}
              <span className="text-white font-semibold">
                {ethToUsdcRate ? `${fmtNum(ethToUsdcRate, 2)} USDC` : "…"}
              </span>
            </span>
            <span>
              1 USDC ≈{" "}
              <span className="text-white font-semibold">
                {usdcToEthRate ? `${fmtNum(usdcToEthRate, 8)} ETH` : "…"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Toggle BUY / SELL */}
      <div className="mt-4 flex bg-[#1b1b2a] rounded-xl p-1 text-sm">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 py-2 rounded-lg transition-all ${
            mode === "buy"
              ? "bg-[#262648] text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Buy USDC
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 py-2 rounded-lg transition-all ${
            mode === "sell"
              ? "bg-[#262648] text-white"
              : "text-gray-400 hover:text-gray-200"
          }`}
        >
          Sell USDC
        </button>
      </div>

      {/* BUY */}
      {mode === "buy" && (
        <div className="mt-4 bg-[#151520] rounded-2xl p-4 sm:p-5 border border-[#2b2b3d]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold">Buy USDC with ETH</p>
            <button
              onClick={handleMaxEth}
              type="button"
              className="text-xs px-3 py-1 rounded-lg bg-[#1b1b2a] border border-[#2b2b3d] hover:bg-[#23233a] transition"
            >
              Max
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <input
              type="number"
              min="0"
              step="0.0001"
              placeholder="ETH to spend"
              value={ethToSpend}
              onChange={(e) => setEthToSpend(e.target.value)}
              className="w-full px-4 py-3 bg-[#1b1b2a] border border-[#2b2b3d] rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none"
            />

            <p className="text-xs text-gray-400">
              You receive ≈{" "}
              <span className="text-gray-100 font-semibold">
                {estimatedUsdcOut} USDC
              </span>
            </p>

            <button
              onClick={handleBuyUsdc}
              disabled={txPending || !ethToSpend || Number(ethToSpend) <= 0}
              className={`mt-2 w-full px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                txPending
                  ? "bg-gray-600 cursor-not-allowed opacity-80"
                  : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-[1.01]"
              }`}
            >
              {txPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Buying...
                </>
              ) : (
                <>
                  <Repeat size={16} /> Buy USDC
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SELL */}
      {mode === "sell" && (
        <div className="mt-4 bg-[#151520] rounded-2xl p-4 sm:p-5 border border-[#2b2b3d]">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold">Sell USDC for ETH</p>
            <button
              onClick={handleMaxUsdc}
              type="button"
              className="text-xs px-3 py-1 rounded-lg bg-[#1b1b2a] border border-[#2b2b3d] hover:bg-[#23233a] transition"
            >
              Max
            </button>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="USDC to sell"
              value={usdcToSell}
              onChange={(e) => setUsdcToSell(e.target.value)}
              className="w-full px-4 py-3 bg-[#1b1b2a] border border-[#2b2b3d] rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none"
            />

            <p className="text-xs text-gray-400">
              You receive ≈{" "}
              <span className="text-gray-100 font-semibold">
                {estimatedEthOut} ETH
              </span>
            </p>

            <button
              onClick={handleSellUsdc}
              disabled={txPending || !usdcToSell || Number(usdcToSell) <= 0}
              className={`mt-2 w-full px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                txPending
                  ? "bg-gray-600 cursor-not-allowed opacity-80"
                  : "bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-[1.01]"
              }`}
            >
              {txPending ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Selling...
                </>
              ) : (
                <>
                  <Repeat size={16} /> Sell USDC
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Status */}
      <div className="mt-3 min-h-[20px]">
        {txStatus === "success" && (
          <p className="text-sm text-green-400">✓ Transaction confirmed on-chain.</p>
        )}
        {txStatus === "error" && (
          <p className="text-sm text-red-400">⚠️ {errorMessage}</p>
        )}
        {!!error && (
          <p className="text-xs text-red-300 mt-1">
            Swap hook error: {String(error)}
          </p>
        )}
      </div>
    </div>
  );
}

