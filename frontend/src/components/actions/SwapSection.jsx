// src/components/actions/SwapSection.jsx
import { useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

import { useAccount, useChainId } from "wagmi";

import { useSwap } from "../../hooks/useSwap";
import useLocalTxHistory from "../../hooks/useLocalTxHistory";
import useWalletFactory from "../../hooks/useWalletFactory";

import {
  Repeat,
  Loader2,
  DollarSign,
  Wallet2,
  TrendingUp,
  Clock3,
  ArrowLeftRight,
  Droplets,
} from "lucide-react";

const USDC_DECIMALS = 6;
const REFRESH_MS = 10_000; // 10s

function formatCompact(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "...";
  const x = Number(n);
  if (x >= 1_000_000_000) return `${(x / 1_000_000_000).toFixed(decimals)}B`;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(decimals)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(decimals)}K`;
  return x.toFixed(decimals);
}

export default function SwapSection() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  // UI state
  const [mode, setMode] = useState("buy");
  const [ethToSpend, setEthToSpend] = useState("");
  const [usdcToSell, setUsdcToSell] = useState("");
  const [selectedWallet, setSelectedWallet] = useState("");

  // Wallet list (SmartWallets)
  const { wallets: smartWallets, refresh: refreshWallets } = useWalletFactory(address || "");

  // active wallet for balances + swap source
  const activeWallet = useMemo(() => selectedWallet || address, [selectedWallet, address]);

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
    getProvider, // optional: if your useSwap exposes it (see note below)
    addresses, // optional: if your useSwap exposes it
  } = useSwap(activeWallet);

  const { addTx } = useLocalTxHistory();

  // derived numbers for UI
  const ethBalanceNum = useMemo(() => {
    if (!ethBalance) return null;
    try {
      return Number(ethers.formatEther(ethBalance));
    } catch {
      return null;
    }
  }, [ethBalance]);

  const usdcBalanceNum = useMemo(() => {
    if (!usdcBalance) return null;
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

  // network label
  const networkName = useMemo(() => {
    if (!chainId) return "Loading...";
    if (chainId === 31337) return "Hardhat Localhost";
    if (chainId === 11155111) return "Sepolia Testnet";
    if (chainId === 1) return "Ethereum Mainnet";
    return `Chain ${chainId}`;
  }, [chainId]);

  // tx status UI
  const [txStatus, setTxStatus] = useState(null); // null | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  // refresh smart wallets when account changes
  useEffect(() => {
    refreshWallets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  // periodic refresh (balances + rates)
  useEffect(() => {
    if (!isConnected || missingConfig) return;
    if (!refresh) return;

    refresh();
    const id = setInterval(() => refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [isConnected, missingConfig, refresh]);

  // --- previews ---
  const estimatedUsdcOut = () => {
    if (!ethUsdPrice || !ethToSpend) return "-";
    const usd = parseFloat(ethToSpend || "0") * ethUsdPrice;
    return usd.toFixed(2);
  };

  const estimatedEthOut = () => {
    if (!ethUsdPrice || !usdcToSell) return "-";
    const usd = parseFloat(usdcToSell || "0");
    if (usd === 0) return "-";
    return (usd / ethUsdPrice).toFixed(6);
  };

  // --- actions ---
  const handleBuyUsdc = async () => {
    if (missingConfig) return;
    if (!ethToSpend || Number(ethToSpend) <= 0) return alert("Insert a valid ETH amount");

    try {
      setTxStatus(null);
      setErrorMessage("");
      const tx = await buyUsdc(ethToSpend); // ideally returns tx hash or receipt
      setTxStatus("success");
      setEthToSpend("");

      // best-effort tx log (if buyUsdc returns tx hash, log it; otherwise skip)
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
    if (!usdcToSell || Number(usdcToSell) <= 0) return alert("Insert a valid USDC amount");

    try {
      setTxStatus(null);
      setErrorMessage("");
      const tx = await sellUsdc(usdcToSell);
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

  // ---- price history for chart (client-side history from ethUsdPrice) ----
  const [priceHistory, setPriceHistory] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (!ethUsdPrice || Number.isNaN(Number(ethUsdPrice))) return;

    const pushPoint = () => {
      const now = new Date();
      const label = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setPriceHistory((prev) => [...prev, { time: label, value: ethUsdPrice }].slice(-30));
      setLastUpdated(now);
    };

    // 1 punto subito + poi ogni REFRESH_MS
    pushPoint();
    const id = setInterval(pushPoint, REFRESH_MS);

    return () => clearInterval(id);
  }, [ethUsdPrice, REFRESH_MS]);


  // ---- liquidity (optional; uses provider + addresses if available) ----
  const [swapEthLiquidity, setSwapEthLiquidity] = useState(null);
  const [swapUsdcLiquidity, setSwapUsdcLiquidity] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchLiquidity() {
      // If your useSwap does not expose provider/addresses, comment this entire block.
      const prov = typeof getProvider === "function" ? await getProvider() : null;
      const swapAddr = addresses?.EthUsdcSwap;
      const usdcAddr = addresses?.USDCMock;

      if (!prov || !swapAddr || !usdcAddr) return;

      try {
        // USDC contract (read-only)
        const usdc = new ethers.Contract(
          usdcAddr,
          [
            "function balanceOf(address) view returns (uint256)",
            "function decimals() view returns (uint8)",
          ],
          prov
        );

        const [ethL, usdcL] = await Promise.all([
          prov.getBalance(swapAddr),
          usdc.balanceOf(swapAddr),
        ]);

        if (cancelled) return;
        setSwapEthLiquidity(Number(ethers.formatEther(ethL)));
        setSwapUsdcLiquidity(Number(ethers.formatUnits(usdcL, USDC_DECIMALS)));
      } catch {
        // silent
      }
    }

    fetchLiquidity();
    const id = setInterval(fetchLiquidity, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [addresses, getProvider]);

  // ---- chart ----
  const chartData = {
    labels: priceHistory.map((p) => p.time),
    datasets: [
      {
        label: "ETH / USD",
        data: priceHistory.map((p) => p.value),
        borderColor: "#a855f7",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const chart = ctx?.chart;
          const canvasCtx = chart?.ctx;
          if (!canvasCtx) return "rgba(168,85,247,0.10)";
          const gradient = canvasCtx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(168,85,247,0.3)");
          gradient.addColorStop(1, "rgba(168,85,247,0)");
          return gradient;
        },
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: "easeInOutQuad" },
    interaction: { intersect: false, mode: "index" },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(15,15,25,0.9)",
        titleColor: "#fff",
        bodyColor: "#c084fc",
        borderWidth: 1,
        borderColor: "#a855f7",
        cornerRadius: 6,
        displayColors: false,
        callbacks: { label: (ctx) => `${ctx.parsed.y.toFixed(2)} $` },
      },
    },
    scales: {
      x: { ticks: { color: "#888", maxTicksLimit: 5 }, grid: { display: false } },
      y: { ticks: { color: "#888" }, grid: { color: "#222" } },
    },
  };

  // ---------- guards ----------
  if (!window.ethereum) {
    return (
      <div className="mt-12 p-6 bg-[#151520]/80 border border-[#2b2b3d] rounded-2xl text-center text-gray-300 w-[440px]">
        <p>You need MetaMask (or another Ethereum provider) to use the swap.</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="mt-12 p-6 bg-[#151520]/80 border border-[#2b2b3d] rounded-2xl text-center text-gray-300 w-full max-w-2xl mx-auto">
        <p className="font-semibold">Wallet not connected.</p>
        <p className="text-sm mt-2">Connect your wallet to use the swap.</p>
      </div>
    );
  }

  if (missingConfig && !loading) {
    return (
      <div className="mt-12 p-6 bg-[#151520]/80 border border-red-500/20 rounded-2xl text-center text-red-200 w-full max-w-2xl mx-auto">
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
    <div className="bg-[#0b0b15] border border-[#1f1f2d] rounded-2xl p-6 w-full max-w-5xl mx-auto shadow-lg text-white">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: form */}
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <Repeat className="text-purple-400" />
            <h2 className="text-xl font-semibold">Token Swap (ETH ⇄ USDC)</h2>
          </div>

          <p className="text-xs text-gray-400 mb-3 flex items-center gap-2">
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

          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span className="bg-[#1f1f2d] px-2 py-1 rounded">{networkName}</span>
            <span>Chain ID: {String(chainId ?? "...")}</span>
          </div>

          {/* Active wallet select */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">
              Active wallet (balances + swap source)
            </label>
            <select
              value={activeWallet || ""}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full px-3 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
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
          </div>

          {/* Balances + key metrics */}
          <div className="bg-[#141421] rounded-xl p-4 mb-4 text-sm text-gray-200 border border-[#1f1f2d]">
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">ETH Balance</span>
              <span className="font-semibold">
                {ethBalanceNum !== null ? ethBalanceNum.toFixed(4) : "..."} ETH
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">USDC Balance</span>
              <span className="font-semibold">
                {usdcBalanceNum !== null ? usdcBalanceNum.toFixed(2) : "..."} USDC
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-[#10101a] rounded-lg p-3 border border-[#1f1f2d]">
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <DollarSign size={12} className="text-purple-400" /> ETH / USD
                </p>
                <p className="text-lg font-bold text-gray-100">
                  {ethUsdPrice ? `${ethUsdPrice.toFixed(2)} $` : "..."}
                </p>
              </div>

              <div className="bg-[#10101a] rounded-lg p-3 border border-[#1f1f2d]">
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <ArrowLeftRight size={12} className="text-purple-400" /> 1 ETH →
                </p>
                <p className="text-lg font-bold text-gray-100">
                  {ethToUsdcRate ? `${ethToUsdcRate.toFixed(2)} USDC` : "..."}
                </p>
              </div>

              <div className="bg-[#10101a] rounded-lg p-3 border border-[#1f1f2d] col-span-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Clock3 size={12} className="text-purple-400" /> Last update
                  </p>
                  <p className="text-[11px] text-gray-500">Refresh every {REFRESH_MS / 1000}s</p>
                </div>
                <p className="text-sm font-semibold text-gray-100">
                  {lastUpdated
                    ? lastUpdated.toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                    : "..."}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  1 USDC ≈{" "}
                  <span className="text-gray-100 font-semibold">
                    {usdcToEthRate ? `${usdcToEthRate.toFixed(8)} ETH` : "..."}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Toggle BUY / SELL */}
          <div className="flex mb-3 bg-[#1b1b2a] rounded-lg p-1 text-xs">
            <button
              onClick={() => setMode("buy")}
              className={`flex-1 py-1 rounded-md transition-all ${mode === "buy"
                  ? "bg-[#262648] text-white"
                  : "text-gray-400 hover:text-gray-200"
                }`}
            >
              Buy USDC
            </button>
            <button
              onClick={() => setMode("sell")}
              className={`flex-1 py-1 rounded-md transition-all ${mode === "sell"
                  ? "bg-[#262648] text-white"
                  : "text-gray-400 hover:text-gray-200"
                }`}
            >
              Sell USDC
            </button>
          </div>

          {/* BUY */}
          {mode === "buy" && (
            <div className="bg-[#151520] rounded-xl p-4 mb-4 border border-[#2b2b3d]">
              <p className="text-sm font-semibold mb-2">Buy USDC with ETH</p>
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.0001"
                  placeholder="ETH to spend"
                  value={ethToSpend}
                  onChange={(e) => setEthToSpend(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg focus:ring-2 focus:ring-purple-500 text-sm outline-none"
                />
                <p className="text-xs text-gray-400">
                  You receive ≈{" "}
                  <span className="text-gray-100">{estimatedUsdcOut()} USDC</span>
                </p>
                <button
                  onClick={handleBuyUsdc}
                  disabled={txPending || !ethToSpend}
                  className={`mt-1 w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${txPending
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
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
            <div className="bg-[#151520] rounded-xl p-4 border border-[#2b2b3d]">
              <p className="text-sm font-semibold mb-2">Sell USDC for ETH</p>
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="USDC to sell"
                  value={usdcToSell}
                  onChange={(e) => setUsdcToSell(e.target.value)}
                  className="w-full px-4 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg focus:ring-2 focus:ring-purple-500 text-sm outline-none"
                />
                <p className="text-xs text-gray-400">
                  You receive ≈{" "}
                  <span className="text-gray-100">{estimatedEthOut()} ETH</span>
                </p>
                <button
                  onClick={handleSellUsdc}
                  disabled={txPending || !usdcToSell}
                  className={`mt-1 w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${txPending
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-105"
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

          {txStatus === "success" && (
            <p className="mt-3 text-sm text-green-400">✓ Transaction confirmed on-chain.</p>
          )}
          {txStatus === "error" && (
            <p className="mt-3 text-sm text-red-400">⚠️ {errorMessage}</p>
          )}
          {!!error && (
            <p className="mt-3 text-xs text-red-300">
              Swap hook error: {String(error)}
            </p>
          )}
        </div>

        {/* RIGHT: chart + info */}
        <div className="flex-1 bg-[#141421] rounded-xl p-4 border border-[#1f1f2d] flex flex-col h-full">
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-300 font-medium flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-400" />
              ETH / USD (live)
            </h3>
            <span className="text-xs text-gray-400">Update every ~{REFRESH_MS / 1000}s</span>
          </div>

          <div className="flex-1 flex flex-col justify-between mt-3">
            <div className="w-full" style={{ height: 260 }}>
              <Line data={chartData} options={chartOptions} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-[#10101a] rounded-lg p-3 border border-[#1f1f2d]">
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Droplets size={12} className="text-purple-400" /> Swap liquidity (ETH)
                </p>
                <p className="text-base font-bold text-gray-100">
                  {swapEthLiquidity !== null ? `${formatCompact(swapEthLiquidity, 3)} ETH` : "..."}
                </p>
              </div>

              <div className="bg-[#10101a] rounded-lg p-3 border border-[#1f1f2d]">
                <p className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Droplets size={12} className="text-purple-400" /> Swap liquidity (USDC)
                </p>
                <p className="text-base font-bold text-gray-100">
                  {swapUsdcLiquidity !== null ? `${formatCompact(swapUsdcLiquidity, 2)} USDC` : "..."}
                </p>
              </div>
            </div>

            <div className="mt-4 bg-[#10101a] rounded-lg p-3 border border-[#1f1f2d]">
              <p className="text-[11px] text-gray-400 flex items-center gap-1">
                <ArrowLeftRight size={12} className="text-purple-400" /> Quick rate reference
              </p>

              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-300">1 ETH</span>
                <span className="text-gray-100 font-semibold">
                  {ethToUsdcRate ? `${ethToUsdcRate.toFixed(2)} USDC` : "..."}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-300">1 USDC</span>
                <span className="text-gray-100 font-semibold">
                  {usdcToEthRate ? `${usdcToEthRate.toFixed(8)} ETH` : "..."}
                </span>
              </div>

              <p className="text-[11px] text-gray-500 mt-3">
                Slippage safety: 1% (auto-minOut)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

