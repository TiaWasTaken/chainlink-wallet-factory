import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import PriceConsumerABI from "../abi/PriceConsumerV3.json";
import MockV3AggregatorABI from "../abi/MockV3Aggregator.json";
import addresses from "../abi/addresses.json";

export default function useOraclePrice() {
  const [price, setPrice] = useState(null);
  const [trend, setTrend] = useState(null);

  const [decimals, setDecimals] = useState(null);
  const [roundId, setRoundId] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [answeredInRound, setAnsweredInRound] = useState(null);

  const feedAddress = addresses.MockV3Aggregator;
  const consumerAddress = addresses.OraclePrice;

  const [network, setNetwork] = useState({
    name: "Loading...",
    chainId: "..."
  });

  const [history, setHistory] = useState([]);
  const lastPrice = useRef(null);

  const fetchPrice = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

      const net = await provider.getNetwork();
      setNetwork({
        name: net.chainId === 31337n ? "Hardhat Localhost" : net.name,
        chainId: Number(net.chainId)
      });

      // ****** QUI LA CORREZIONE IMPORTANTE ******
      const consumer = new ethers.Contract(
        addresses.OraclePrice,
        PriceConsumerABI.abi,
        provider
      );

      const aggregator = new ethers.Contract(
        addresses.MockV3Aggregator,
        MockV3AggregatorABI.abi,
        provider
      );

      const dec = Number(await consumer.getDecimals());
      setDecimals(dec);

      const latestPrice = await consumer.getLatestPrice();

      const formatted = Number(latestPrice) / Math.pow(10, dec);


      const rd = await aggregator.latestRoundData();
      setRoundId(Number(rd[0]));
      setUpdatedAt(Number(rd[3]));
      setAnsweredInRound(Number(rd[4]));

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
    price, trend,
    decimals, roundId, updatedAt, answeredInRound,
    feedAddress, consumerAddress,
    network, history
  };
}

