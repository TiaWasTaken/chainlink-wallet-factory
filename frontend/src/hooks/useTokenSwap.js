// src/hooks/useTokenSwap.js
import { useEffect, useState } from "react";
import { ethers } from "ethers";

import WalletFactoryABI from "../abi/WalletFactory.json";
import SmartWalletABI from "../abi/SmartWallet.json";
import MockTokenABI from "../abi/MockToken.json";
import addresses from "../abi/addresses.json";

const MOCK_EXCHANGE_RATE = 1000; // 1 ETH = 1000 MCK (mock)

export default function useTokenSwap(account) {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);

  const [walletAddress, setWalletAddress] = useState(null);
  const [tokenAddress, setTokenAddress] = useState(addresses.MockToken);

  const [mode, setMode] = useState("ethToToken"); // "ethToToken" | "tokenToEth"
  const [amountIn, setAmountIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);

  // inizializza provider / signer
  useEffect(() => {
    if (!window.ethereum || !account) return;

    const p = new ethers.BrowserProvider(window.ethereum);
    p.getSigner().then((s) => {
      setProvider(p);
      setSigner(s);
    });
  }, [account]);

  // recupera il primo wallet dell’utente
  useEffect(() => {
    const loadWallet = async () => {
      if (!provider || !account) return;

      const factory = new ethers.Contract(
        addresses.WalletFactory,
        WalletFactoryABI.abi,
        provider
      );

      const wallets = await factory.getUserWallets(account);
      if (wallets.length > 0) {
        setWalletAddress(wallets[0]);
      } else {
        setWalletAddress(null);
      }
    };

    loadWallet();
  }, [provider, account]);

  const pushHistory = (direction, amountInStr, amountOutStr) => {
    const now = new Date();
    const label = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    setHistory((prev) => {
      const updated = [
        ...prev,
        {
          time: label,
          direction,
          amountIn: amountInStr,
          amountOut: amountOutStr,
        },
      ];
      return updated.slice(-20);
    });
  };

  const estimateOut = () => {
    if (!amountIn || Number.isNaN(Number(amountIn))) return "";
    const v = Number(amountIn);

    if (mode === "ethToToken") {
      return (v * MOCK_EXCHANGE_RATE).toString();
    } else {
      return (v / MOCK_EXCHANGE_RATE).toString();
    }
  };

  const swap = async () => {
    try {
      if (!signer || !walletAddress) {
        throw new Error("Wallet non trovato. Crea prima uno SmartWallet.");
      }
      if (!amountIn || Number(amountIn) <= 0) {
        throw new Error("Inserisci un importo valido.");
      }

      setLoading(true);
      setStatus("Inviando transazione...");

      const wallet = new ethers.Contract(
        walletAddress,
        SmartWalletABI.abi,
        signer
      );

      if (mode === "ethToToken") {
        // Lo SmartWallet usa il proprio saldo ETH.
        const ethAmountWei = ethers.parseEther(amountIn);

        const tx = await wallet.swapETHForTokens(tokenAddress, ethAmountWei);
        const receipt = await tx.wait();

        pushHistory("ETH → Token", amountIn, estimateOut());

        setStatus(`Swap completato. Tx: ${receipt.hash}`);
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: "Swap ETH → Token completato",
          })
        );
      } else {
        // Token → ETH: approva prima, poi chiama swapTokensForETH
        const token = new ethers.Contract(
          tokenAddress,
          MockTokenABI.abi,
          signer
        );

        const tokenAmount = ethers.parseUnits(amountIn, 18);

        setStatus("Approving token spend...");
        const approveTx = await token.approve(walletAddress, tokenAmount);
        await approveTx.wait();

        setStatus("Eseguendo swap Token → ETH...");
        const tx = await wallet.swapTokensForETH(tokenAddress, tokenAmount);
        const receipt = await tx.wait();

        pushHistory("Token → ETH", amountIn, estimateOut());

        setStatus(`Swap completato. Tx: ${receipt.hash}`);
        window.dispatchEvent(
          new CustomEvent("toast", {
            detail: "Swap Token → ETH completato",
          })
        );
      }

      setAmountIn("");
    } catch (err) {
      console.error("Swap error:", err);
      setStatus(err.message || "Errore durante lo swap");
      window.dispatchEvent(
        new CustomEvent("toast", { detail: "Errore durante lo swap" })
      );
    } finally {
      setLoading(false);
    }
  };

  return {
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
  };
}

