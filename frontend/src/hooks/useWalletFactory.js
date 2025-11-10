// src/hooks/useWalletFactory.js
import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import factoryAbi from "../abi/WalletFactory.json";
import { WALLET_FACTORY_ADDRESS } from "../config";

export default function useWalletFactory(account) {
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);
  const balanceTimerRef = useRef(null);
  const eventsAttachedRef = useRef(false);

  // 🔗 Ensure contract is ready (auto-reset when account changes)
  const ensureContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    // 🔁 Recreate instances if account changed or contract not set
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
      console.log("📜 WalletFactory reinitialized for:", address);
    }

    return contractRef.current;
  }, []);

  // 📦 Fetch wallets for user
  const fetchWallets = useCallback(async () => {
    if (!account) return [];
    try {
      setIsLoading(true);
      const contract = await ensureContract();
      const list = await contract.getUserWallets(account);
      console.log("💾 Wallets fetched:", list);
      setWallets(list);
      return list;
    } catch (err) {
      console.error("❌ fetchWallets error:", err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [account, ensureContract]);

  // 💰 Fetch balances
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
      console.error("❌ fetchBalances error:", err);
    }
  }, []);

  // 🧱 Create new wallet
  const createWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      const contract = await ensureContract();
      console.log("🚀 createWallet()");
      const tx = await contract.createWallet();
      console.log("📤 TX sent:", tx.hash);
      await tx.wait();
      console.log("✅ TX confirmed");
      const list = await fetchWallets(); // 🔁 reload list
      await fetchBalances(list);
    } catch (err) {
      console.error("❌ createWallet error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [ensureContract, fetchWallets, fetchBalances]);

  // 🔁 Manual refresh
  const refresh = useCallback(async () => {
    const list = await fetchWallets();
    await fetchBalances(list);
  }, [fetchWallets, fetchBalances]);

  // 🧩 Initial load + polling
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!account) return;
      const list = await fetchWallets();
      if (!mounted) return;
      await fetchBalances(list);

      // Update balances every 3s
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

  // 🧠 Live event listener
  useEffect(() => {
    (async () => {
      if (eventsAttachedRef.current) return;
      try {
        const contract = await ensureContract();
        if (!contract) {
          console.warn("⚠️ Contract instance missing, skipping event listener");
          return;
        }

        const handler = async (user, newWallet) => {
          if (!account || user.toLowerCase() !== account.toLowerCase()) return;
          console.log("🟣 WalletCreated for", user, "wallet:", newWallet);
          await refresh();
        };

        contract.on("WalletCreated", handler);
        eventsAttachedRef.current = true;
        console.log("✅ Event listener attached to WalletCreated");

        return () => {
          contract.off("WalletCreated", handler);
          eventsAttachedRef.current = false;
          console.log("🧹 Event listener removed");
        };
      } catch (e) {
        console.warn("⚠️ Event binding failed:", e?.message);
      }
    })();
  }, [account, ensureContract, refresh]);

  return { wallets, balances, isLoading, createWallet, refresh };
}

