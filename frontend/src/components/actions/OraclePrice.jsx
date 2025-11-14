import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { TrendingUp } from "lucide-react";
import useOraclePrice from "../../hooks/useOraclePrice";

export default function OraclePrice() {
  const {
    price,
    trend,
    decimals,
    roundId,
    updatedAt,
    answeredInRound,
    feedAddress,
    consumerAddress,
    network,
    history
  } = useOraclePrice();

  const getColor = () => {
    if (trend === "up") return "text-green-400";
    if (trend === "down") return "text-red-400";
    return "text-white";
  };

  const chartData = {
    labels: history.map((d) => d.time),
    datasets: [
      {
        label: "ETH/USD Price",
        data: history.map((d) => d.value),
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
        pointHoverRadius: 0,
      },
    ],
  };

  const chartOptions = {
    animation: { duration: 300 },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: "#777", maxTicksLimit: 6 },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#777" },
        grid: { color: "#222" },
      },
    },
  };

  return (
    <div className="bg-[#0b0b15] border border-[#1f1f2d] rounded-2xl p-6 w-full max-w-6xl mx-auto shadow-lg">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT SIDE — PRICE + DATA */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-semibold text-white">Oracle Price</h2>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                trend ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              LIVE
            </span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            ETH/USD from Chainlink-compatible Price Feed (Mock)
          </p>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm">ETH/USD Price</p>
              <p className={`text-4xl font-bold ${getColor()}`}>
                {price
                  ? `$${price.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`
                  : "--"}
              </p>
              <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                Updated:{" "}
                {new Date(updatedAt * 1000).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Technical info block */}
          <div className="bg-[#141421] rounded-xl p-4 mb-3 text-gray-300 text-sm">
            <p className="font-semibold mb-2">Technical details</p>

            <div className="flex flex-col gap-1">
              <span>Decimals: {decimals}</span>
              <span>Round ID: {roundId}</span>
              <span>Answered In Round: {answeredInRound}</span>
              <span>
                Feed Address:{" "}
                <span className="text-purple-400">
                  {feedAddress.slice(0, 6)}...{feedAddress.slice(-4)}
                </span>
              </span>
              <span>
                Consumer Address:{" "}
                <span className="text-purple-400">
                  {consumerAddress.slice(0, 6)}...{consumerAddress.slice(-4)}
                </span>
              </span>
              <span className="mt-2 text-gray-500 text-xs">
                Network: {network.name} (Chain ID: {network.chainId})
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE — CHART */}
        <div className="flex-1 bg-[#141421] rounded-xl p-4">
          <h3 className="text-sm text-gray-300 mb-2 font-medium">
            Price Trend (Last 30 updates)
          </h3>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

