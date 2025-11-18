// src/components/actions/TokenSwap.jsx
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { ArrowLeftRight, Wallet, Activity } from "lucide-react";
import useTokenSwap from "../../hooks/useTokenSwap";

export default function TokenSwap({ account }) {
  const {
    walletAddress,
    tokenAddress,
    setTokenAddress,
    mode,
    setMode,
    amountIn,
    setAmountIn,
    estimateOut,
    loading,
    status,
    swap,
    history,
  } = useTokenSwap(account);

  const estimatedOut = estimateOut();

  const chartData = {
    labels: history.map((h) => h.time),
    datasets: [
      {
        label: "Amount in",
        data: history.map((h) => Number(h.amountIn)),
        borderColor: "#a855f7",
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        backgroundColor: (ctx) => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, "rgba(168,85,247,0.25)");
          gradient.addColorStop(1, "rgba(168,85,247,0)");
          return gradient;
        },
        pointRadius: 0,
      },
    ],
  };

  const chartOptions = {
    animation: { duration: 400 },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#888", maxTicksLimit: 5 }, grid: { display: false } },
      y: { ticks: { color: "#888" }, grid: { color: "#222" } },
    },
  };

  const formatAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "N/A";

  return (
    <div className="bg-[#0b0b15] border border-[#1f1f2d] rounded-2xl p-6 w-full max-w-5xl mx-auto shadow-lg">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDE */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <ArrowLeftRight className="text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Token Swap</h2>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Swap mock ETH ↔ MockToken all&apos;interno del tuo SmartWallet.
          </p>

          <div className="mb-4 flex gap-2">
            <button
              className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                mode === "ethToToken"
                  ? "bg-purple-600/70 border-purple-500 text-white"
                  : "bg-[#121222] border-[#2b2b3d] text-gray-300"
              }`}
              onClick={() => setMode("ethToToken")}
            >
              ETH → Token
            </button>
            <button
              className={`flex-1 px-3 py-2 rounded-lg text-sm border ${
                mode === "tokenToEth"
                  ? "bg-purple-600/70 border-purple-500 text-white"
                  : "bg-[#121222] border-[#2b2b3d] text-gray-300"
              }`}
              onClick={() => setMode("tokenToEth")}
            >
              Token → ETH
            </button>
          </div>

          <div className="mb-4 space-y-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Amount {mode === "ethToToken" ? "ETH" : "Token"}
              </label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={amountIn}
                onChange={(e) => setAmountIn(e.target.value)}
                className="w-full rounded-lg bg-[#121222] border border-[#2b2b3d] px-3 py-2 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="0.0"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Token address (MockToken)
              </label>
              <input
                type="text"
                value={tokenAddress}
                onChange={(e) => setTokenAddress(e.target.value)}
                className="w-full rounded-lg bg-[#121222] border border-[#2b2b3d] px-3 py-2 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="text-sm text-gray-400">
              Estimated output:{" "}
              <span className="text-gray-100 font-semibold">
                {estimatedOut ? estimatedOut : "--"}{" "}
                {mode === "ethToToken" ? "Token" : "ETH"}
              </span>
            </div>
          </div>

          <button
            onClick={swap}
            disabled={loading || !walletAddress}
            className="w-full mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Swapping..." : "Swap"}
          </button>

          {status && (
            <p className="mt-3 text-xs text-gray-400 break-all">{status}</p>
          )}

          <div className="mt-5 text-xs text-gray-500 space-y-1">
            <div className="flex items-center gap-2">
              <Wallet size={14} className="text-purple-400" />
              <span>
                SmartWallet:{" "}
                <span className="text-gray-300">
                  {formatAddress(walletAddress)}
                </span>
              </span>
            </div>
            <div>
              Connected account:{" "}
              <span className="text-gray-300">
                {account ? formatAddress(account) : "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE – chart storica */}
        <div className="flex-1 bg-[#141421] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={16} className="text-purple-400" />
            <h3 className="text-sm text-gray-300 font-medium">
              Swap History (Amount in)
            </h3>
          </div>
          {history.length === 0 ? (
            <p className="text-xs text-gray-500">
              Nessuno swap eseguito in questa sessione.
            </p>
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </div>
    </div>
  );
}

