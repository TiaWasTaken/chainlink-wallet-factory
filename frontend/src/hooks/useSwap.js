// src/hooks/useSwap.js
import { useEffect, useState, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { useAccount, useChainId } from "wagmi";

import USDCMockArtifact from "../abi/USDCMock.json";
import EthUsdcSwapArtifact from "../abi/EthUsdcSwap.json";
import SmartWalletArtifact from "../abi/SmartWallet.json";
import PriceConsumerABI from "../abi/PriceConsumerV3.json";

import { getAddresses } from "../abi/addressesByChain";

const USDC_DECIMALS = 6;
const SLIPPAGE_BPS = 100n; // 1%
const REFRESH_MS = 10_000;

function applySlippageBps(amount, bps) {
  return (amount * (10000n - bps)) / 10000n;
}

const isAddr = (a) => typeof a === "string" && ethers.isAddress(a);

export function useSwap(activeWalletAddress) {
  const { address: eoaAddress, isConnected } = useAccount();
  const chainId = useChainId();

  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [usdc, setUsdc] = useState(null);
  const [swap, setSwap] = useState(null);
  const [priceConsumer, setPriceConsumer] = useState(null);

  const [ethBalance, setEthBalance] = useState(null); // BigInt
  const [usdcBalance, setUsdcBalance] = useState(null); // BigInt
  const [ethUsdPrice, setEthUsdPrice] = useState(null); // number
  const [ethToUsdcRate, setEthToUsdcRate] = useState(null); // number

  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState(null);

  const activeAddress = activeWalletAddress || eoaAddress;

  const isSmartWallet =
    !!activeAddress &&
    !!eoaAddress &&
    activeAddress.toLowerCase() !== eoaAddress.toLowerCase();

  const addresses = useMemo(() => {
    if (!chainId) return null;
    try {
      return getAddresses(chainId);
    } catch {
      return null;
    }
  }, [chainId]);

  const missingConfig = useMemo(() => {
    if (!isConnected) return "Wallet not connected.";
    if (!addresses) return `Unsupported network (no addresses for chainId ${chainId}).`;

    const required = [
      ["EthUsdcSwap", addresses.EthUsdcSwap],
      ["USDCMock", addresses.USDCMock],
      ["PriceConsumerV3", addresses.PriceConsumerV3],
    ];

    const missing = required.filter(([, v]) => !isAddr(v));
    if (!missing.length) return null;

    return `Missing/invalid addresses: ${missing
      .map(([k, v]) => `${k}=${String(v)}`)
      .join(", ")}`;
  }, [isConnected, addresses, chainId]);

  // ---- init provider/signer/contracts (NO eth_requestAccounts) ----
  useEffect(() => {
    let cancelled = false;

    async function init() {
      setLoading(true);
      setError(null);

      setProvider(null);
      setSigner(null);
      setUsdc(null);
      setSwap(null);
      setPriceConsumer(null);

      if (!window.ethereum) {
        setError("No wallet found (window.ethereum missing).");
        setLoading(false);
        return;
      }

      if (!isConnected || !eoaAddress) {
        setLoading(false);
        return;
      }

      if (missingConfig) {
        setError(missingConfig);
        setLoading(false);
        return;
      }

      try {
        const _provider = new ethers.BrowserProvider(window.ethereum);
        const _signer = await _provider.getSigner();

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

        // Read-only is enough for price consumer
        const consumer = new ethers.Contract(
          addresses.PriceConsumerV3,
          PriceConsumerABI.abi,
          _provider
        );

        if (cancelled) return;

        setProvider(_provider);
        setSigner(_signer);
        setUsdc(usdcContract);
        setSwap(swapContract);
        setPriceConsumer(consumer);
      } catch (e) {
        console.error("useSwap init error:", e);
        if (!cancelled) setError(e?.message ?? "Init error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [isConnected, eoaAddress, chainId, addresses, missingConfig]);

  const getSmartWallet = useCallback(() => {
    if (!signer || !activeAddress) return null;
    if (!ethers.isAddress(activeAddress)) return null;
    return new ethers.Contract(activeAddress, SmartWalletArtifact.abi, signer);
  }, [signer, activeAddress]);

  // ---- refresh ----
  const refresh = useCallback(async () => {
    if (!provider || !activeAddress || !usdc || !swap || !priceConsumer) return;

    try {
      setError(null);

      const [ethBal, usdcBalRaw] = await Promise.all([
        provider.getBalance(activeAddress),
        usdc.balanceOf(activeAddress),
      ]);

      const oneEth = ethers.parseEther("1");
      const rateUsdc = await swap.quoteBuyUsdc(oneEth);

      // price from PriceConsumerV3 (robust BigInt parsing)
      const dec = Number(await priceConsumer.getDecimals());
      const latest = await priceConsumer.getLatestPrice();
      const latestBig = typeof latest === "bigint" ? latest : BigInt(latest);

      setEthBalance(ethBal);
      setUsdcBalance(usdcBalRaw);

      // rate (1 ETH -> USDC)
      setEthToUsdcRate(Number(ethers.formatUnits(rateUsdc, USDC_DECIMALS)));

      if (latestBig > 0n) {
        const asStr = ethers.formatUnits(latestBig, dec); // safe conversion
        const asNum = Number(asStr);
        setEthUsdPrice(Number.isFinite(asNum) ? asNum : null);
      } else {
        setEthUsdPrice(null);
      }
    } catch (e) {
      console.error("useSwap refresh error:", e);
      setError(e?.shortMessage || e?.message || "Refresh error");
    }
  }, [provider, activeAddress, usdc, swap, priceConsumer]);

  useEffect(() => {
    if (!provider || !activeAddress || !usdc || !swap || !priceConsumer) return;
    refresh();
    const id = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(id);
  }, [provider, activeAddress, usdc, swap, priceConsumer, refresh]);

  // ---- actions ----
  const buyUsdc = useCallback(
    async (ethAmount) => {
      if (!swap || !eoaAddress || !activeAddress) return null;

      try {
        setTxPending(true);
        setError(null);

        const ethWei = ethers.parseEther(String(ethAmount));
        const quotedUsdc = await swap.quoteBuyUsdc(ethWei);
        const minUsdcOut = applySlippageBps(quotedUsdc, SLIPPAGE_BPS);

        if (isSmartWallet) {
          const wallet = getSmartWallet();
          if (!wallet) throw new Error("SmartWallet not ready");
          const tx = await wallet.swapEthToUsdc(ethWei, minUsdcOut);
          const receipt = await tx.wait();
          await refresh();
          return { tx, receipt };
        } else {
          const tx = await swap.buyUsdc(eoaAddress, { value: ethWei });
          const receipt = await tx.wait();
          await refresh();
          return { tx, receipt };
        }
      } catch (e) {
        console.error("buyUsdc error:", e);
        setError(e?.shortMessage || e?.message || "buyUsdc failed");
        throw e;
      } finally {
        setTxPending(false);
      }
    },
    [swap, eoaAddress, activeAddress, isSmartWallet, getSmartWallet, refresh]
  );

  const sellUsdc = useCallback(
    async (usdcAmount) => {
      if (!swap || !usdc || !eoaAddress || !activeAddress) return null;

      try {
        setTxPending(true);
        setError(null);

        const amount = ethers.parseUnits(String(usdcAmount), USDC_DECIMALS);
        const quotedEth = await swap.quoteSellUsdc(amount);
        const minEthOut = applySlippageBps(quotedEth, SLIPPAGE_BPS);

        if (isSmartWallet) {
          const wallet = getSmartWallet();
          if (!wallet) throw new Error("SmartWallet not ready");
          const tx = await wallet.swapUsdcToEth(amount, minEthOut);
          const receipt = await tx.wait();
          await refresh();
          return { tx, receipt };
        } else {
          // approve + sell
          const approveTx = await usdc.approve(await swap.getAddress(), amount);
          await approveTx.wait();

          const sellTx = await swap.sellUsdc(eoaAddress, amount);
          const receipt = await sellTx.wait();

          await refresh();
          return { tx: sellTx, receipt };
        }
      } catch (e) {
        console.error("sellUsdc error:", e);
        setError(e?.shortMessage || e?.message || "sellUsdc failed");
        throw e;
      } finally {
        setTxPending(false);
      }
    },
    [swap, usdc, eoaAddress, activeAddress, isSmartWallet, getSmartWallet, refresh]
  );

  return {
    loading,
    txPending,
    error,

    chainId,
    addresses,
    missingConfig,

    eoaAddress,
    activeAddress,
    isSmartWallet,

    ethBalance,
    usdcBalance,
    ethUsdPrice,
    ethToUsdcRate,

    buyUsdc,
    sellUsdc,
    refresh,
  };
}

