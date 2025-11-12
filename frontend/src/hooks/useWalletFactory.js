import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import factoryAbi from "../abi/WalletFactory.json";
import { WALLET_FACTORY_ADDRESS } from "../config";
import useLocalTxHistory from "./useLocalTxHistory";

export default function useWalletFactory(account) {
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);
  const balanceTimerRef = useRef(null);
  const eventsAttachedRef = useRef(false);

  const { addTx } = useLocalTxHistory();

  // Initialize provider, signer, and contract
  const ensureContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    if (
      !providerRef.current ||
      !signerRef.current ||
      !contractRef.current ||
      signerRef.current.address !== address
    ) {
      providerRef.current = provider;
      signerRef.current = signer;
      contractRef.current = new ethers.Contract(
        WALLET_FACTORY_ADDRESS,
        factoryAbi.abi,
        signer
      );
      console.log("WalletFactory reinitialized for:", address);
    }

    return contractRef.current;
  }, []);

  // Fetch wallets for the given account
  const fetchWallets = useCallback(async () => {
    if (!account) return [];
    try {
      setIsLoading(true);
      const contract = await ensureContract();
      const list = await contract.getUserWallets(account);
      console.log("Wallets fetched:", list);
      setWallets(list);
      return list;
    } catch (err) {
      console.error("fetchWallets error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [account, ensureContract]);

  // Fetch balances for a list of wallets
  const fetchBalances = useCallback(async (list) => {
    if (!list || !list.length) {
      setBalances({});
      return;
    }
    try {
      const provider = providerRef.current || new ethers.BrowserProvider(window.ethereum);
      const updated = {};
      for (const addr of list) {
        const balWei = await provider.getBalance(addr);
        updated[addr] = Number(ethers.formatEther(balWei));
      }
      setBalances(updated);
    } catch (err) {
      console.error("fetchBalances error:", err);
    }
  }, []);

  // Create a new wallet
  const createWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      const contract = await ensureContract();
      console.log("createWallet()");
      const tx = await contract.createWallet();
      console.log("Transaction sent:", tx.hash);

      // Save locally as pending
      addTx({
        hash: tx.hash,
        from: account,
        to: WALLET_FACTORY_ADDRESS,
        amount: 0,
        timestamp: new Date().toISOString(),
        status: "pending_wallet_creation",
      });

      await tx.wait();
      console.log("Transaction confirmed:", tx.hash);

      const list = await fetchWallets();
      await fetchBalances(list);

      // Save completed transaction
      addTx({
        hash: tx.hash,
        from: account,
        to: list[list.length - 1] || "unknown_wallet",
        amount: 0,
        timestamp: new Date().toISOString(),
        status: "wallet_created",
      });
    } catch (err) {
      console.error("createWallet error:", err);
      addTx({
        hash: err?.transaction?.hash || "N/A",
        from: account,
        to: WALLET_FACTORY_ADDRESS,
        amount: 0,
        timestamp: new Date().toISOString(),
        status: "error_wallet_creation",
      });
    } finally {
      setIsLoading(false);
    }
  }, [account, ensureContract, fetchWallets, fetchBalances, addTx]);

  // Refresh wallets and balances
  const refresh = useCallback(async () => {
    const list = await fetchWallets();
    await fetchBalances(list);
  }, [fetchWallets, fetchBalances]);

  // Auto-refresh balances every 3 seconds
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!account) return;
      const list = await fetchWallets();
      if (!mounted) return;
      await fetchBalances(list);

      balanceTimerRef.current && clearInterval(balanceTimerRef.current);
      balanceTimerRef.current = setInterval(() => {
        fetchBalances(list);
      }, 3000);
    })();

    return () => {
      mounted = false;
      balanceTimerRef.current && clearInterval(balanceTimerRef.current);
    };
  }, [account, fetchWallets, fetchBalances]);

  // Listen to WalletCreated events (no duplicates)
  useEffect(() => {
    let contract;
    let handler;

    const attachListener = async () => {
      if (eventsAttachedRef.current) return;

      try {
        contract = await ensureContract();
        if (!contract) {
          console.warn("Contract instance missing, skipping listener");
          return;
        }

        eventsAttachedRef.current = true;

        handler = async (user, newWallet) => {
          if (!account || user.toLowerCase() !== account.toLowerCase()) return;

          console.log("WalletCreated event received for:", newWallet);

          // Prevent duplicate entries (same wallet already stored)
          const existing = localStorage.getItem("tx_history");
          if (existing && existing.includes(newWallet.slice(2, 8))) return;

          addTx({
            hash: "event-" + newWallet.slice(2, 8),
            from: WALLET_FACTORY_ADDRESS,
            to: newWallet,
            amount: 0,
            timestamp: new Date().toISOString(),
            status: "wallet_created_event",
          });

          await refresh();
        };

        contract.on("WalletCreated", handler);
        console.log("Event listener attached to WalletCreated");
      } catch (e) {
        console.warn("Event binding failed:", e?.message);
      }
    };

    attachListener();

    return () => {
      try {
        if (contract && handler) {
          contract.off("WalletCreated", handler);
          console.log("Event listener removed");
        }
      } catch (err) {
        console.warn("Error detaching listener:", err.message);
      }
      eventsAttachedRef.current = false;
    };
  }, [account, ensureContract, refresh, addTx]);

  return { wallets, balances, isLoading, createWallet, refresh };
}

