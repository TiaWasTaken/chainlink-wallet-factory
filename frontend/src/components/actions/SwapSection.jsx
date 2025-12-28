// src/components/actions/SwapSection.jsx
import { useEffect, useState, useMemo } from "react";
import { ethers } from "ethers";
import { Line } from "react-chartjs-2";
import "chart.js/auto";

import EthUsdcSwapABI from "../../abi/EthUsdcSwap.json";
import USDCMockABI from "../../abi/USDCMock.json";
import MockV3AggregatorABI from "../../abi/MockV3Aggregator.json";
import addresses from "../../abi/addresses.json";
import useLocalTxHistory from "../../hooks/useLocalTxHistory";
import useWalletFactory from "../../hooks/useWalletFactory";

import {
  Repeat,
  Loader2,
  DollarSign,
  Wallet2,
  TrendingUp,
} from "lucide-react";

const USDC_DECIMALS = 6;

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
  const [priceHistory, setPriceHistory] = useState([]);

  const [ethToSpend, setEthToSpend] = useState("");
  const [usdcToSell, setUsdcToSell] = useState("");

  const [txStatus, setTxStatus] = useState(null); // "buy-pending" | "sell-pending" | "success" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  // quale pannello mostrare: "buy" o "sell"
  const [mode, setMode] = useState("buy");

  // wallet attivo (main account + smart wallets)
  const [selectedWallet, setSelectedWallet] = useState("");

  const { addTx } = useLocalTxHistory();

  // smart wallets creati da questo account
  const {
    wallets: smartWallets,
    balances: smartBalances, // non lo usiamo ancora ma può tornare utile
    refresh: refreshWallets,
  } = useWalletFactory(account || "");

  // indirizzo effettivo su cui mostriamo i bilanci
  const activeAddress = useMemo(
    () => selectedWallet || account,
    [selectedWallet, account]
  );

  // per ora SELL è permesso solo dal main account (per problemi di approve)
  const sellingFromMain =
    !!account &&
    (!activeAddress ||
      activeAddress.toLowerCase() === account.toLowerCase());

  // -------- init provider + account ----------
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
      setSelectedWallet(acc); // di default il wallet attivo è il main

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
      return () =>
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, [refreshWallets]);

  // -------- init contracts when provider/signer ready ----------
  useEffect(() => {
    if (!provider || !signer) return;

    const swap = new ethers.Contract(
      addresses.EthUsdcSwap,
      EthUsdcSwapABI.abi,
      signer
    );
    const usdc = new ethers.Contract(
      addresses.USDCMock,
      USDCMockABI.abi,
      signer
    );
    const agg = new ethers.Contract(
      addresses.MockV3Aggregator,
      MockV3AggregatorABI.abi,
      provider
    );

    setSwapContract(swap);
    setUsdcContract(usdc);
    setAggContract(agg);
  }, [provider, signer]);

  // -------- fetch balances ----------
  const refreshBalances = async () => {
    if (!provider || !activeAddress || !usdcContract) return;

    const [ethBalRaw, usdcBalRaw] = await Promise.all([
      provider.getBalance(activeAddress),
      usdcContract.balanceOf(activeAddress),
    ]);

    setEthBalance(Number(ethers.formatEther(ethBalRaw)));
    setUsdcBalance(
      Number(ethers.formatUnits(usdcBalRaw, USDC_DECIMALS))
    );
  };

  // -------- fetch price (from Chainlink aggregator) ----------
  const fetchPrice = async () => {
    if (!aggContract) return;
    try {
      const roundData = await aggContract.latestRoundData();
      const answer = roundData[1]; // int256
      const decimals = await aggContract.decimals();

      if (answer <= 0n) throw new Error("Invalid price");

      let normalized;
      if (decimals === 8) {
        normalized = Number(answer);
      } else if (decimals > 8) {
        normalized = Number(answer / 10n ** BigInt(decimals - 8));
      } else {
        normalized = Number(answer * 10n ** BigInt(8 - decimals));
      }

      const price = normalized / 1e8; // ETH/USD in $
      setEthUsdPrice(price);

      // storico (ultimi 30 punti)
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
    } catch (err) {
      console.error("Error fetching price:", err);
    }
  };

  // -------- first load + interval (3s) ----------
  useEffect(() => {
    if (!aggContract || !activeAddress) return;

    (async () => {
      await Promise.all([refreshBalances(), fetchPrice()]);
    })();

    const id = setInterval(fetchPrice, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggContract, activeAddress]);

  // aggiorna i bilanci quando cambia il wallet attivo
  useEffect(() => {
    refreshBalances();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAddress, usdcContract]);

  // -------- helpers for preview ----------
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

  // -------- actions ----------
  const handleBuyUsdc = async () => {
    if (!swapContract || !signer || !account) return;
    if (!ethToSpend || Number(ethToSpend) <= 0) {
      alert("Insert a valid ETH amount");
      return;
    }

    try {
      setTxStatus("buy-pending");
      setErrorMessage("");

      const value = ethers.parseEther(ethToSpend);
      const recipient = activeAddress || account;

      const tx = await swapContract.buyUsdc(recipient, { value });
      const receipt = await tx.wait();

      addTx({
        hash: tx.hash,
        from: account,
        to: addresses.EthUsdcSwap,
        amount: ethToSpend,
        timestamp: new Date().toISOString(),
        status: "success",
        type: "BUY_USDC",
        recipient,
      });

      console.log("Buy USDC receipt:", receipt.hash);
      setTxStatus("success");
      setEthToSpend("");
      await refreshBalances();
    } catch (err) {
      console.error("Buy USDC failed:", err);
      setTxStatus("error");
      setErrorMessage(err?.shortMessage || err?.message || "Transaction failed");

      addTx({
        hash: err?.transaction?.hash || "N/A",
        from: account,
        to: addresses.EthUsdcSwap,
        amount: ethToSpend,
        timestamp: new Date().toISOString(),
        status: "error",
        type: "BUY_USDC",
      });
    }
  };

  const handleSellUsdc = async () => {
    if (!swapContract || !usdcContract || !signer || !account) return;
    if (!usdcToSell || Number(usdcToSell) <= 0) {
      alert("Insert a valid USDC amount");
      return;
    }
    if (!sellingFromMain) {
      alert("Selling from smart wallets is not supported yet. Use your main account.");
      return;
    }

    try {
      setTxStatus("sell-pending");
      setErrorMessage("");

      const amount = ethers.parseUnits(usdcToSell, USDC_DECIMALS);
      const recipient = activeAddress || account;

      // Approve from main account
      const approveTx = await usdcContract.approve(
        addresses.EthUsdcSwap,
        amount
      );
      await approveTx.wait();

      // Sell
      const tx = await swapContract.sellUsdc(recipient, amount);
      const receipt = await tx.wait();

      addTx({
        hash: tx.hash,
        from: account,
        to: addresses.EthUsdcSwap,
        amount: usdcToSell,
        timestamp: new Date().toISOString(),
        status: "success",
        type: "SELL_USDC",
        recipient,
      });

      console.log("Sell USDC receipt:", receipt.hash);
      setTxStatus("success");
      setUsdcToSell("");
      await refreshBalances();
    } catch (err) {
      console.error("Sell USDC failed:", err);
      setTxStatus("error");
      setErrorMessage(err?.shortMessage || err?.message || "Transaction failed");

      addTx({
        hash: err?.transaction?.hash || "N/A",
        from: account,
        to: addresses.EthUsdcSwap,
        amount: usdcToSell,
        timestamp: new Date().toISOString(),
        status: "error",
        type: "SELL_USDC",
      });
    }
  };

  // -------- chart data ----------
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
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
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
        callbacks: {
          label: (ctx) => `${ctx.parsed.y.toFixed(2)} $`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#888", maxTicksLimit: 5 },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#888" },
        grid: { color: "#222" },
      },
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
        {/* LEFT: form + balances */}
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
            <span className="bg-[#1f1f2d] px-2 py-1 rounded">
              {network.name}
            </span>
            <span>Chain ID: {network.chainId}</span>
          </div>

          {/* Select active wallet (main + smart wallets) */}
          <div className="mb-4">
            <label className="text-xs text-gray-400 mb-1 block">
              Active wallet (balances + swap destination)
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

          <div className="bg-[#141421] rounded-xl p-4 mb-4 text-sm text-gray-200">
            <div className="flex justify-between mb-1">
              <span>ETH Balance</span>
              <span>
                {ethBalance !== null ? ethBalance.toFixed(4) : "..."} ETH
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span>USDC Balance</span>
              <span>
                {usdcBalance !== null ? usdcBalance.toFixed(2) : "..."} USDC
              </span>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400 items-center gap-2">
              <span className="flex items-center gap-1">
                <DollarSign size={12} className="text-purple-400" />
                ETH / USD:
              </span>
              <span className="font-semibold text-gray-100">
                {ethUsdPrice ? `${ethUsdPrice.toFixed(2)} $` : "..."}
              </span>
            </div>
          </div>

          {/* Toggle BUY / SELL */}
          <div className="flex mb-3 bg-[#1b1b2a] rounded-lg p-1 text-xs">
            <button
              onClick={() => setMode("buy")}
              className={`flex-1 py-1 rounded-md transition-all ${
                mode === "buy"
                  ? "bg-[#262648] text-white"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              Buy USDC
            </button>
            <button
              onClick={() => setMode("sell")}
              className={`flex-1 py-1 rounded-md transition-all ${
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
                  <span className="text-gray-100">
                    {estimatedUsdcOut()} USDC
                  </span>
                </p>
                <button
                  onClick={handleBuyUsdc}
                  disabled={txStatus === "buy-pending" || !ethToSpend}
                  className={`mt-1 w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    txStatus === "buy-pending"
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
                  You receive ≈{" "}
                  <span className="text-gray-100">
                    {estimatedEthOut()} ETH
                  </span>
                </p>
                <button
                  onClick={handleSellUsdc}
                  disabled={
                    txStatus === "sell-pending" ||
                    !usdcToSell ||
                    !sellingFromMain
                  }
                  className={`mt-1 w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                    txStatus === "sell-pending" || !sellingFromMain
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
                {!sellingFromMain && (
                  <p className="mt-2 text-[11px] text-yellow-400">
                    Selling from smart wallets is not supported yet. Select your
                    main account to sell.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* status */}
          {txStatus === "success" && (
            <p className="mt-3 text-sm text-green-400">
              ✓ Transaction confirmed on-chain.
            </p>
          )}
          {txStatus === "error" && (
            <p className="mt-3 text-sm text-red-400">
              ⚠️ {errorMessage}
            </p>
          )}
        </div>

        {/* RIGHT: price chart */}
        <div className="flex-1 bg-[#141421] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm text-gray-300 font-medium flex items-center gap-2">
              <TrendingUp size={14} className="text-purple-400" />
              ETH / USD (live)
            </h3>
            <span className="text-xs text-gray-400">
              Update every ~3s
            </span>
          </div>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

