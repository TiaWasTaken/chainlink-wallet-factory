import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { Loader2, Zap, TrendingUp, Coins } from "lucide-react";

export default function GasTracker() {
  const [gasData, setGasData] = useState({
    gasPrice: null,
    maxFee: null,
    priorityFee: null,
  });
  const [txCosts, setTxCosts] = useState({});
  const [history, setHistory] = useState([]);
  const [network, setNetwork] = useState({ name: "Loading...", chainId: "..." });
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(true);

  const fetchGasData = async () => {
    try {
      const apiKey = import.meta.env.VITE_ETHERSCAN_API_KEY;
      const res = await fetch(
        `https://api.etherscan.io/v2/api?chainid=1&module=gastracker&action=gasoracle&apikey=${apiKey}`
      );
      const data = await res.json();

      if (data.status === "1" && data.result) {
        const gwei = Number(data.result.ProposeGasPrice);
        const maxFee = Number(data.result.FastGasPrice);
        const priorityFee = Number(data.result.SafeGasPrice);

        setGasData({ gasPrice: gwei, maxFee, priorityFee });
        setLive(true);

        // aggiornamento storico: mantiene gli ultimi 30 punti
        setHistory((prev) => {
          const now = new Date();
          const label = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const updated = [...prev, { time: label, value: gwei }];
          return updated.slice(-30);
        });

        calcTransactionCosts(gwei);
        setLoading(false);
      } else {
        setFallbackData();
      }
    } catch {
      setFallbackData();
    }
  };

  const calcTransactionCosts = (gwei) => {
    const gasPriceEth = ethers.formatEther(
      ethers.parseUnits(gwei.toString(), "gwei")
    );
    const price = parseFloat(gasPriceEth);
    const txGas = { send: 21000, deploy: 1200000, swap: 100000 };
    const ethCosts = {
      send: (txGas.send * price).toFixed(6),
      deploy: (txGas.deploy * price).toFixed(6),
      swap: (txGas.swap * price).toFixed(6),
    };
    setTxCosts(ethCosts);
  };

  const setFallbackData = () => {
    const fakeGas = (Math.random() * 30 + 10).toFixed(3);
    const fakeMax = (Number(fakeGas) + 5).toFixed(3);
    const fakePrio = (Math.random() * 2 + 1).toFixed(3);
    const gwei = Number(fakeGas);

    setGasData({ gasPrice: gwei, maxFee: Number(fakeMax), priorityFee: Number(fakePrio) });
    setLive(false);

    setHistory((prev) => {
      const now = new Date();
      const label = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const updated = [...prev, { time: label, value: gwei }];
      return updated.slice(-30);
    });

    calcTransactionCosts(gwei);
    setLoading(false);
  };

  useEffect(() => {
    const detectNetwork = async () => {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        let name = net.name;
        if (net.chainId === 31337n) name = "Hardhat Localhost";
        if (net.chainId === 11155111n) name = "Sepolia Testnet";
        if (net.chainId === 1n) name = "Ethereum Mainnet";
        setNetwork({ name, chainId: Number(net.chainId) });
      }
    };
    detectNetwork();
  }, []);

  useEffect(() => {
    fetchGasData();
    const interval = setInterval(fetchGasData, 10000);
    return () => clearInterval(interval);
  }, []);

  const getColor = () => {
    const g = gasData.gasPrice;
    if (!g) return "text-gray-400";
    if (g < 20) return "text-green-400";
    if (g < 40) return "text-yellow-400";
    return "text-red-500";
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-40 text-gray-400">
        <Loader2 className="animate-spin mr-2" /> Loading gas data...
      </div>
    );

  const chartData = {
    labels: history.map((d) => d.time),
    datasets: [
      {
        label: "Gas Price (Gwei)",
        data: history.map((d) => d.value),
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
        pointBackgroundColor: "#a855f7",
        pointHoverBackgroundColor: "#c084fc",
      },
    ],
  };

  const chartOptions = {
    animation: { duration: 800, easing: "easeInOutQuad" },
    interaction: {
      intersect: false,
      mode: "index", // tooltip segue il mouse
    },
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
          label: (ctx) => `${ctx.parsed.y.toFixed(3)} Gwei`,
        },
      },
    },
    scales: {
      x: {
        ticks: { color: "#888", maxTicksLimit: 5 },
        grid: { display: false },
      },
      y: {
        ticks: { color: "#888", callback: (v) => v.toFixed(3) },
        grid: { color: "#222" },
      },
    },
  };


  return (
    <div className="bg-[#0b0b15] border border-[#1f1f2d] rounded-2xl p-6 w-full max-w-5xl mx-auto shadow-lg">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="text-purple-400" />
            <h2 className="text-xl font-semibold text-white">Gas Tracker</h2>
            <span
              className={`ml-2 px-2 py-0.5 rounded-full text-xs ${live ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                }`}
            >
              {live ? "LIVE" : "OFFLINE"}
            </span>
          </div>

          <p className="text-gray-400 text-sm mb-4">
            Live Ethereum gas metrics and estimated transaction costs.
          </p>

          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm">Gas Price</p>
              <p className={`text-3xl font-bold ${getColor()}`}>
                {gasData.gasPrice?.toFixed(3)} Gwei
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {gasData.gasPrice < 20
                  ? "Low (great time to transact)"
                  : gasData.gasPrice < 40
                    ? "Medium (normal activity)"
                    : "High (network congested)"}
              </p>
            </div>

            <div className="text-right text-sm text-gray-400">
              <p>Max Fee: {gasData.maxFee?.toFixed(3)} Gwei</p>
              <p>Priority Fee: {gasData.priorityFee?.toFixed(3)} Gwei</p>
              <p className="flex items-center justify-end gap-1 mt-1 text-xs">
                <TrendingUp size={12} />{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
          </div>

          <div className="bg-[#141421] rounded-xl p-4 mb-3 text-gray-300">
            <p className="font-semibold mb-2 flex items-center gap-2">
              <Coins size={14} className="text-purple-400" /> Estimated Transaction Cost
            </p>
            <div className="text-sm flex flex-col gap-1">
              <div className="flex justify-between">
                <span>Send ETH</span>
                <span>≈ {txCosts.send} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Deploy Contract</span>
                <span>≈ {txCosts.deploy} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>Swap Tokens</span>
                <span>≈ {txCosts.swap} ETH</span>
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-500 flex justify-between items-center">
            <span className="bg-[#1f1f2d] px-2 py-1 rounded text-gray-400">
              {network.name}
            </span>
            <span>Chain ID: {network.chainId}</span>
          </div>
        </div>

        <div className="flex-1 bg-[#141421] rounded-xl p-4">
          <h3 className="text-sm text-gray-300 mb-2 font-medium">
            Gas Price Trend (Gwei)
          </h3>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}

