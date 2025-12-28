// src/components/actions/SwapSection.jsx
import { useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

import EthUsdcSwapABI from "../../abi/EthUsdcSwap.json";
import USDCMockABI from "../../abi/USDCMock.json";
import MockV3AggregatorABI from "../../abi/MockV3Aggregator.json";
import SmartWalletABI from "../../abi/SmartWallet.json";
import addresses from "../../abi/addresses.json";

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
const SLIPPAGE_BPS = 100n; // 1%
const REFRESH_MS = 10_000; // ✅ 10 seconds

function applySlippageBps(amount, bps) {
  return (amount * (10000n - bps)) / 10000n;
}

function formatCompact(n, decimals = 2) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "...";
  const x = Number(n);
  if (x >= 1_000_000_000) return `${(x / 1_000_000_000).toFixed(decimals)}B`;
  if (x >= 1_000_000) return `${(x / 1_000_000).toFixed(decimals)}M`;
  if (x >= 1_000) return `${(x / 1_000).toFixed(decimals)}K`;
  return x.toFixed(decimals);
}

export default function SwapSection() {
  const [account, setAccount] = useState(null);
  const [network, setNetwork] = useState({ name: "Loading...", chainId: "..." });

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [swapContract, setSwapContract] = useState(null);
  const [usdcContract, setUsdcContract] = useState(null);
  const [aggContract, setAggContract] = useState(null);

  const [ethBalance, setEthBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);

  const [ethUsdPrice, setEthUsdPrice] = useState(null);
  const [ethToUsdcRate, setEthToUsdcRate] = useState(null); // 1 ETH -> X USDC (quote)
  const [usdcToEthRate, setUsdcToEthRate] = useState(null); // 1 USDC -> X ETH (derived)
  const [priceHistory, setPriceHistory] = useState([]);

  const [lastUpdated, setLastUpdated] = useState(null);

  const [ethToSpend, setEthToSpend] = useState("");
  const [usdcToSell, setUsdcToSell] = useState("");

  const [txStatus, setTxStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [mode, setMode] = useState("buy");

  const [selectedWallet, setSelectedWallet] = useState("");

  const { addTx } = useLocalTxHistory();
  const { wallets: smartWallets, refresh: refreshWallets } = useWalletFactory(account || "");

  const activeAddress = useMemo(() => selectedWallet || account, [selectedWallet, account]);

  const isSmartWallet = useMemo(() => {
    if (!account || !activeAddress) return false;
    return activeAddress.toLowerCase() !== account.toLowerCase();
  }, [account, activeAddress]);

  // ---------- init provider + account ----------
  useEffect(() => {
    const init = async () => {
      if (!window.ethereum) return;

      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      const acc = accounts[0];
      setAccount(acc);
      setSelectedWallet(acc);

      const s = await prov.getSigner();
      setSigner(s);

      const net = await prov.getNetwork();
      let name = net.name;
      if (net.chainId === 31337n) name = "Hardhat Localhost";
      if (net.chainId === 11155111n) name = "Sepolia Testnet";
      if (net.chainId === 1n) name = "Ethereum Mainnet";
      setNetwork({ name, chainId: Number(net.chainId) });
    };

    init();

    const handleAccountsChanged = (accs) => {
      if (!accs.length) return;
      setAccount(accs[0]);
      setSelectedWallet(accs[0]);
      refreshWallets();
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, [refreshWallets]);

  // ---------- init contracts ----------
  useEffect(() => {
    if (!provider || !signer) return;

    const swap = new ethers.Contract(addresses.EthUsdcSwap, EthUsdcSwapABI.abi, signer);
    const usdc = new ethers.Contract(addresses.USDCMock, USDCMockABI.abi, signer);
    const agg = new ethers.Contract(addresses.MockV3Aggregator, MockV3AggregatorABI.abi, provider);

    setSwapContract(swap);
    setUsdcContract(usdc);
    setAggContract(agg);
  }, [provider, signer]);

  const getActiveSmartWallet = () => {
    if (!signer || !activeAddress) return null;
    return new ethers.Contract(activeAddress, SmartWalletABI.abi, signer);
  };

  // ---------- balances ----------
  const refreshBalances = async () => {
    if (!provider || !activeAddress || !usdcContract) return;

    const [ethBalRaw, usdcBalRaw] = await Promise.all([
      provider.getBalance(activeAddress),
      usdcContract.balanceOf(activeAddress),
    ]);

    setEthBalance(Number(ethers.formatEther(ethBalRaw)));
    setUsdcBalance(Number(ethers.formatUnits(usdcBalRaw, USDC_DECIMALS)));
  };

  // ---------- price fetch (BigInt-safe) ----------
  const fetchPrice = async () => {
    if (!aggContract) return;
    try {
      const roundData = await aggContract.latestRoundData();
      const answer = roundData[1]; // BigInt
      const decimals = await aggContract.decimals(); // number

      if (answer <= 0n) throw new Error("Invalid price");

      const d = BigInt(decimals);

      let normalized1e8;
      if (d === 8n) normalized1e8 = answer;
      else if (d > 8n) normalized1e8 = answer / (10n ** (d - 8n));
      else normalized1e8 = answer * (10n ** (8n - d));

      const price = Number(normalized1e8) / 1e8;
      setEthUsdPrice(price);

      const now = new Date();
      const label = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      setPriceHistory((prev) => {
        const updated = [...prev, { time: label, value: price }];
        return updated.slice(-30);
      });

      setLastUpdated(now);
    } catch (err) {
      console.error("Error fetching price:", err);
    }
  };

  // ---------- quotes ----------
  const fetchRates = async () => {
    if (!swapContract) return;
    try {
      const oneEth = ethers.parseEther("1");
      const usdcOut = await swapContract.quoteBuyUsdc(oneEth); // 6 decimals
      const rateEthToUsdc = Number(ethers.formatUnits(usdcOut, 6));
      setEthToUsdcRate(rateEthToUsdc);

      // derived: 1 USDC -> ETH
      if (rateEthToUsdc > 0) {
        setUsdcToEthRate(1 / rateEthToUsdc);
      } else {
        setUsdcToEthRate(null);
      }
    } catch (e) {
      console.error("Error fetching rates:", e);
    }
  };

  // ---------- swap liquidity snapshot ----------
  const [swapEthLiquidity, setSwapEthLiquidity] = useState(null);
  const [swapUsdcLiquidity, setSwapUsdcLiquidity] = useState(null);

  const fetchLiquidity = async () => {
    if (!provider || !usdcContract) return;
    try {
      const [ethL, usdcL] = await Promise.all([
        provider.getBalance(addresses.EthUsdcSwap),
        usdcContract.balanceOf(addresses.EthUsdcSwap),
      ]);
      setSwapEthLiquidity(Number(ethers.formatEther(ethL)));
      setSwapUsdcLiquidity(Number(ethers.formatUnits(usdcL, 6)));
    } catch (e) {
      console.error("Error fetching liquidity:", e);
    }
  };

  // ---------- initial load + interval (10s) ----------
  useEffect(() => {
    if (!aggContract || !activeAddress) return;

    (async () => {
      await Promise.all([refreshBalances(), fetchPrice(), fetchRates(), fetchLiquidity()]);
    })();

    const id = setInterval(async () => {
      await Promise.all([fetchPrice(), fetchRates(), fetchLiquidity()]);
    }, REFRESH_MS);

    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggContract, activeAddress, swapContract]);

  useEffect(() => {
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress, usdcContract]);

  // ---------- previews ----------
  const estimatedUsdcOut = () => {
    if (!ethUsdPrice || !ethToSpend) return "-";
    const usd = parseFloat(ethToSpend || "0") * ethUsdPrice;
    return usd.toFixed(2);
  };

  const estimatedEthOut = () => {
    if (!ethUsdPrice || !usdcToSell) return "-";
    const usd = parseFloat(usdcToSell || "0");
    if (usd === 0) return "-";
    const eth = usd / ethUsdPrice;
    return eth.toFixed(6);
  };

  // ---------- actions ----------
  const handleBuyUsdc = async () => {
    if (!swapContract || !signer || !account) return;
    if (!ethToSpend || Number(ethToSpend) <= 0) {
      alert("Insert a valid ETH amount");
      return;
    }

    try {
      setTxStatus("buy-pending");
      setErrorMessage("");

      const ethWei = ethers.parseEther(ethToSpend);

      const quotedUsdc = await swapContract.quoteBuyUsdc(ethWei);
      const minUsdcOut = applySlippageBps(quotedUsdc, SLIPPAGE_BPS);

      let tx;
      let to;

      if (isSmartWallet) {
        const wallet = getActiveSmartWallet();
        if (!wallet) throw new Error("SmartWallet not ready");
        tx = await wallet.swapEthToUsdc(ethWei, minUsdcOut);
        to = activeAddress;
      } else {
        tx = await swapContract.buyUsdc(account, { value: ethWei });
        to = addresses.EthUsdcSwap;
      }

      await tx.wait();

      addTx({
        hash: tx.hash,
        from: account,
        to,
        amount: ethToSpend,
        timestamp: new Date().toISOString(),
        status: "success",
        type: isSmartWallet ? "BUY_USDC_SMARTWALLET" : "BUY_USDC_MAIN",
        recipient: activeAddress,
      });

      setTxStatus("success");
      setEthToSpend("");
      await refreshBalances();
      await fetchLiquidity();
    } catch (err) {
      console.error("Buy failed:", err);
      setTxStatus("error");
      setErrorMessage(err?.shortMessage || err?.message || "Transaction failed");
    }
  };

  const handleSellUsdc = async () => {
    if (!swapContract || !usdcContract || !signer || !account) return;
    if (!usdcToSell || Number(usdcToSell) <= 0) {
      alert("Insert a valid USDC amount");
      return;
    }

    try {
      setTxStatus("sell-pending");
      setErrorMessage("");

      const amountUsdc = ethers.parseUnits(usdcToSell, USDC_DECIMALS);

      const quotedEth = await swapContract.quoteSellUsdc(amountUsdc);
      const minEthOut = applySlippageBps(quotedEth, SLIPPAGE_BPS);

      let tx;
      let to;

      if (isSmartWallet) {
        const wallet = getActiveSmartWallet();
        if (!wallet) throw new Error("SmartWallet not ready");
        tx = await wallet.swapUsdcToEth(amountUsdc, minEthOut);
        to = activeAddress;
      } else {
        const approveTx = await usdcContract.approve(addresses.EthUsdcSwap, amountUsdc);
        await approveTx.wait();
        tx = await swapContract.sellUsdc(account, amountUsdc);
        to = addresses.EthUsdcSwap;
      }

      await tx.wait();

      addTx({
        hash: tx.hash,
        from: account,
        to,
        amount: usdcToSell,
        timestamp: new Date().toISOString(),
        status: "success",
        type: isSmartWallet ? "SELL_USDC_SMARTWALLET" : "SELL_USDC_MAIN",
        recipient: activeAddress,
      });

      setTxStatus("success");
      setUsdcToSell("");
      await refreshBalances();
      await fetchLiquidity();
    } catch (err) {
      console.error("Sell failed:", err);
      setTxStatus("error");
      setErrorMessage(err?.shortMessage || err?.message || "Transaction failed");
    }
  };

  // ---------- chart ----------
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

  if (!window.ethereum) {
    return (
      <div className="mt-12 p-6 bg-[#151520]/80 border border-[#2b2b3d] rounded-2xl text-center text-gray-300 w-[440px]">
        <p>You need MetaMask (or another Ethereum provider) to use the swap.</p>
      </div>
    );
  }

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
            {account ? (
              <>
                Connected:&nbsp;
                <span className="text-gray-200">
                  {account.slice(0, 8)}…{account.slice(-6)}
                </span>
              </>
            ) : (
              "Connecting wallet..."
            )}
          </p>

          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span className="bg-[#1f1f2d] px-2 py-1 rounded">{network.name}</span>
            <span>Chain ID: {network.chainId}</span>
          </div>

          {/* Active wallet select */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">
              Active wallet (balances + swap source)
            </label>
            <select
              value={activeAddress || ""}
              onChange={(e) => setSelectedWallet(e.target.value)}
              className="w-full px-3 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {account && (
                <option value={account}>
                  {account.slice(0, 8)}…{account.slice(-6)} — Main Account
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
              <span className="font-semibold">{ethBalance !== null ? ethBalance.toFixed(4) : "..."} ETH</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-300">USDC Balance</span>
              <span className="font-semibold">{usdcBalance !== null ? usdcBalance.toFixed(2) : "..."} USDC</span>
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
                  <p className="text-[11px] text-gray-500">
                    Refresh every {REFRESH_MS / 1000}s
                  </p>
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
              className={`flex-1 py-1 rounded-md transition-all ${mode === "buy" ? "bg-[#262648] text-white" : "text-gray-400 hover:text-gray-200"
                }`}
            >
              Buy USDC
            </button>
            <button
              onClick={() => setMode("sell")}
              className={`flex-1 py-1 rounded-md transition-all ${mode === "sell" ? "bg-[#262648] text-white" : "text-gray-400 hover:text-gray-200"
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
                  You receive ≈ <span className="text-gray-100">{estimatedUsdcOut()} USDC</span>
                </p>
                <button
                  onClick={handleBuyUsdc}
                  disabled={txStatus === "buy-pending" || !ethToSpend}
                  className={`mt-1 w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${txStatus === "buy-pending"
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
                    }`}
                >
                  {txStatus === "buy-pending" ? (
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
                  You receive ≈ <span className="text-gray-100">{estimatedEthOut()} ETH</span>
                </p>
                <button
                  onClick={handleSellUsdc}
                  disabled={txStatus === "sell-pending" || !usdcToSell}
                  className={`mt-1 w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${txStatus === "sell-pending"
                      ? "bg-gray-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-indigo-600 to-purple-500 hover:scale-105"
                    }`}
                >
                  {txStatus === "sell-pending" ? (
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
          {txStatus === "error" && <p className="mt-3 text-sm text-red-400">⚠️ {errorMessage}</p>}
        </div>

        {/* RIGHT: chart + info */}
        <div className="flex-1 bg-[#141421] rounded-xl p-4 border border-[#1f1f2d] flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm text-gray-300 font-medium flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-400" />
              ETH / USD (live)
            </h3>
            <span className="text-xs text-gray-400">Update every ~{REFRESH_MS / 1000}s</span>
          </div>

          {/* ✅ Main content vertically balanced */}
          <div className="flex-1 flex flex-col justify-between mt-3">
            {/* Chart */}
            <div className="w-full" style={{ height: 260 }}>
              <Line data={chartData} options={chartOptions} />
            </div>

            {/* Liquidity cards */}
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

            {/* Quick rate reference */}
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
                Slippage safety: {Number(SLIPPAGE_BPS) / 100}% (auto-minOut)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

