// src/hooks/useSwap.js
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";

import addresses from "../abi/addresses.json";
import USDCMockArtifact from "../abi/USDCMock.json";
import EthUsdcSwapArtifact from "../abi/EthUsdcSwap.json";
import SmartWalletArtifact from "../abi/SmartWallet.json";

const USDC_DECIMALS = 6;
const SLIPPAGE_BPS = 100n; // 1%

function applySlippageBps(amount, bps) {
  return (amount * (10000n - bps)) / 10000n;
}

export function useSwap(activeWalletAddress) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [eoaAddress, setEoaAddress] = useState(null);

  const [usdc, setUsdc] = useState(null);
  const [swap, setSwap] = useState(null);

  const [ethBalance, setEthBalance] = useState(null);
  const [usdcBalance, setUsdcBalance] = useState(null);
  const [ethUsdPrice, setEthUsdPrice] = useState(null);
  const [ethToUsdcRate, setEthToUsdcRate] = useState(null);

  const [loading, setLoading] = useState(true);
  const [txPending, setTxPending] = useState(false);
  const [error, setError] = useState(null);

  const activeAddress = activeWalletAddress || eoaAddress;
  const isSmartWallet =
    !!activeAddress && !!eoaAddress && activeAddress.toLowerCase() !== eoaAddress.toLowerCase();

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

        setProvider(_provider);
        setSigner(_signer);
        setEoaAddress(userAddr);
        setUsdc(usdcContract);
        setSwap(swapContract);
      } catch (e) {
        console.error("useSwap init error:", e);
        setError(e?.message ?? "Init error");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  const getSmartWallet = useCallback(() => {
    if (!signer || !activeAddress) return null;
    return new ethers.Contract(activeAddress, SmartWalletArtifact.abi, signer);
  }, [signer, activeAddress]);

  // ---- refresh balances + price ----
  const refresh = useCallback(async () => {
    if (!provider || !activeAddress || !usdc || !swap) return;

    try {
      const [ethBal, usdcBalRaw] = await Promise.all([
        provider.getBalance(activeAddress),
        usdc.balanceOf(activeAddress),
      ]);

      // price + rate (on chain quote)
      const price1e8 = await swap.getEthUsdPrice1e8?.();
      const oneEth = ethers.parseEther("1");
      const rateUsdc = await swap.quoteBuyUsdc(oneEth);

      setEthBalance(ethBal);
      setUsdcBalance(usdcBalRaw);

      if (price1e8 !== undefined) setEthUsdPrice(Number(price1e8) / 1e8);
      setEthToUsdcRate(Number(ethers.formatUnits(rateUsdc, 6)));
    } catch (e) {
      console.error("useSwap refresh error:", e);
      setError(e?.message ?? "Refresh error");
    }
  }, [provider, activeAddress, usdc, swap]);

  useEffect(() => {
    if (!provider || !activeAddress || !usdc || !swap) return;
    refresh();
    const id = setInterval(refresh, 3000);
    return () => clearInterval(id);
  }, [provider, activeAddress, usdc, swap, refresh]);

  // ---- actions: buy & sell (wallet-centric) ----
  const buyUsdc = useCallback(
    async (ethAmount) => {
      if (!swap || !signer || !eoaAddress || !activeAddress) return;

      try {
        setTxPending(true);
        setError(null);

        const ethWei = ethers.parseEther(ethAmount.toString());

        const quotedUsdc = await swap.quoteBuyUsdc(ethWei);
        const minUsdcOut = applySlippageBps(quotedUsdc, SLIPPAGE_BPS);

        if (isSmartWallet) {
          const wallet = getSmartWallet();
          if (!wallet) throw new Error("SmartWallet not ready");
          const tx = await wallet.swapEthToUsdc(ethWei, minUsdcOut);
          await tx.wait();
        } else {
          const tx = await swap.buyUsdc(eoaAddress, { value: ethWei });
          await tx.wait();
        }

        await refresh();
      } catch (e) {
        console.error("buyUsdc error:", e);
        setError(e?.shortMessage || e?.message || "buyUsdc failed");
      } finally {
        setTxPending(false);
      }
    },
    [swap, signer, eoaAddress, activeAddress, isSmartWallet, getSmartWallet, refresh]
  );

  const sellUsdc = useCallback(
    async (usdcAmount) => {
      if (!swap || !usdc || !signer || !eoaAddress || !activeAddress) return;

      try {
        setTxPending(true);
        setError(null);

        const amount = ethers.parseUnits(usdcAmount.toString(), USDC_DECIMALS);

        const quotedEth = await swap.quoteSellUsdc(amount);
        const minEthOut = applySlippageBps(quotedEth, SLIPPAGE_BPS);

        if (isSmartWallet) {
          const wallet = getSmartWallet();
          if (!wallet) throw new Error("SmartWallet not ready");
          const tx = await wallet.swapUsdcToEth(amount, minEthOut);
          await tx.wait();
        } else {
          const approveTx = await usdc.approve(await swap.getAddress(), amount);
          await approveTx.wait();
          const sellTx = await swap.sellUsdc(eoaAddress, amount);
          await sellTx.wait();
        }

        await refresh();
      } catch (e) {
        console.error("sellUsdc error:", e);
        setError(e?.shortMessage || e?.message || "sellUsdc failed");
      } finally {
        setTxPending(false);
      }
    },
    [swap, usdc, signer, eoaAddress, activeAddress, isSmartWallet, getSmartWallet, refresh]
  );

  return {
    loading,
    txPending,
    error,

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

