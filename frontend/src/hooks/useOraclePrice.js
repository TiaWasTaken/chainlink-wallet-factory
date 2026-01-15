import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import EthUsdcSwapABI from "../abi/EthUsdcSwap.json";
import addresses from "../abi/addresses.json";

export default function useOraclePrice() {
  const [price, setPrice] = useState(null);
  const [trend, setTrend] = useState(null);

  const [decimals, setDecimals] = useState(8);
  const [roundId, setRoundId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [answeredInRound, setAnsweredInRound] = useState(null);

  // Ora la "fonte" è lo swap, che internamente legge il feed Chainlink/mock
  const feedAddress = addresses.EthUsdFeed; // lo scriviamo nel deploy_all.js
  const consumerAddress = addresses.EthUsdcSwap;

  const [network, setNetwork] = useState({
    name: "Loading...",
    chainId: "..."
  });

  const [history, setHistory] = useState([]);
  const lastPrice = useRef(null);

  const fetchPrice = async () => {
    try {
      if (!window.ethereum) return;

      // Wallet-based provider: funziona su desktop + mobile (MetaMask browser)
      const provider = new ethers.BrowserProvider(window.ethereum);

      const net = await provider.getNetwork();
      setNetwork({
        name: net.chainId === 31337n ? "Hardhat Localhost" : net.name,
        chainId: Number(net.chainId)
      });

      const swap = new ethers.Contract(
        addresses.EthUsdcSwap,
        EthUsdcSwapABI.abi,
        provider
      );

      // prezzo ETH/USD normalizzato 1e8
      const price1e8 = await swap.getEthUsdPrice1e8();
      const formatted = Number(price1e8) / 1e8;

      // i campi roundId/updatedAt/answeredInRound non li abbiamo dallo swap
      // (a meno di leggere il feed direttamente). Li lasciamo null e UI li gestirà.
      setRoundId(null);
      setUpdatedAt(Math.floor(Date.now() / 1000)); // fallback: "adesso"
      setAnsweredInRound(null);

      if (lastPrice.current !== null) {
        if (formatted > lastPrice.current) setTrend("up");
        else if (formatted < lastPrice.current) setTrend("down");
        else setTrend(null);
      }

      lastPrice.current = formatted;
      setPrice(formatted);

      const now = new Date();
      const label = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });

      setHistory(prev => [...prev, { time: label, value: formatted }].slice(-30));
    } catch (err) {
      console.log("Oracle price error:", err);
    }
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
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
  };
}

