// src/hooks/useSwap.js
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

import addresses from "../abi/addresses.json";
import USDCMockArtifact from "../abi/USDCMock.json";
import EthUsdcSwapArtifact from "../abi/EthUsdcSwap.json";
import OraclePriceArtifact from "../abi/OraclePrice.json";

const USDC_DECIMALS = 6;

export function useSwap() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState(null);

  const [usdc, setUsdc] = useState(null);
  const [swap, setSwap] = useState(null);
  const [oracle, setOracle] = useState(null);

  const [ethBalance, setEthBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [ethUsdPrice, setEthUsdPrice] = useState(null);

  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState(null);

  // ---- init provider + contracts ----
  useEffect(() => {
    async function init() {
      if (!window.ethereum) {
        setError("No wallet found (window.ethereum is missing).");
        setLoading(false);
        return;
      }

      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        await _provider.send("eth_requestAccounts", []);
        const _signer = await _provider.getSigner();
        const userAddr = await _signer.getAddress();

        const usdcContract = new ethers.Contract(
          addresses.USDCMock,
          USDCMockArtifact.abi,
          _signer
        );

        const swapContract = new ethers.Contract(
          addresses.EthUsdcSwap,
          EthUsdcSwapArtifact.abi,
          _signer
        );

        const oracleContract = new ethers.Contract(
          addresses.OraclePrice,
          OraclePriceArtifact.abi,
          _signer
        );

        setProvider(_provider);
        setSigner(_signer);
        setAddress(userAddr);
        setUsdc(usdcContract);
        setSwap(swapContract);
        setOracle(oracleContract);
      } catch (e) {
        console.error("useSwap init error:", e);
        setError(e.message ?? "Init error");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  // ---- refresh balances + price ----
  const refresh = useCallback(async () => {
    if (!provider || !address || !usdc || !oracle) return;

    try {
      const [ethBal, usdcBalRaw] = await Promise.all([
        provider.getBalance(address),
        usdc.balanceOf(address),
      ]);

      // ATTENZIONE: cambia il nome della funzione se nel tuo OraclePrice è diverso
      // es. getLatestPrice(), getEthUsdPrice(), ecc.
      const priceRaw = await oracle.getLatestPrice?.() ?? await oracle.getEthUsdPrice();

      setEthBalance(ethBal);
      setUsdcBalance(usdcBalRaw);
      // priceRaw è tipicamente un int con 8 decimali (1e8)
      setEthUsdPrice(Number(priceRaw) / 1e8);
    } catch (e) {
      console.error("useSwap refresh error:", e);
      setError(e.message ?? "Refresh error");
    }
  }, [provider, address, usdc, oracle]);

  useEffect(() => {
    if (!provider || !address || !usdc || !oracle) return;

    // primo refresh subito
    refresh();

    // poi ogni 3 secondi
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [provider, address, usdc, oracle, refresh]);

  // ---- actions: buy & sell ----
  const buyUsdc = useCallback(
    async (ethAmount) => {
      if (!swap || !signer || !address) return;
      try {
        setTxPending(true);
        setError(null);

        const value = ethers.parseEther(ethAmount.toString());

        const tx = await swap.buyUsdc(address, { value });
        await tx.wait();

        await refresh();
      } catch (e) {
        console.error("buyUsdc error:", e);
        setError(e.message ?? "buyUsdc failed");
      } finally {
        setTxPending(false);
      }
    },
    [swap, signer, address, refresh]
  );

  const sellUsdc = useCallback(
    async (usdcAmount) => {
      if (!swap || !usdc || !signer || !address) return;
      try {
        setTxPending(true);
        setError(null);

        const amount = ethers.parseUnits(
          usdcAmount.toString(),
          USDC_DECIMALS
        );

        // Approve prima
        const approveTx = await usdc.approve(await swap.getAddress(), amount);
        await approveTx.wait();

        // Poi sell
        const sellTx = await swap.sellUsdc(address, amount);
        await sellTx.wait();

        await refresh();
      } catch (e) {
        console.error("sellUsdc error:", e);
        setError(e.message ?? "sellUsdc failed");
      } finally {
        setTxPending(false);
      }
    },
    [swap, usdc, signer, address, refresh]
  );

  return {
    loading,
    txPending,
    error,
    address,
    ethBalance,
    usdcBalance,
    ethUsdPrice,
    buyUsdc,
    sellUsdc,
  };
}

