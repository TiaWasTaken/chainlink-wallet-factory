import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import factoryAbi from "../abi/WalletFactory.json";
import { getAddresses } from "../config";
import useLocalTxHistory from "./useLocalTxHistory";

export default function useWalletFactory(account) {
  const [wallets, setWallets] = useState([]);
  const [balances, setBalances] = useState({});
  const [isBusy, setIsBusy] = useState(false);

  const providerRef = useRef(null);
  const signerRef = useRef(null);
  const contractRef = useRef(null);
  const chainIdRef = useRef(null);

  const balanceTimerRef = useRef(null);


  const listenerKeyRef = useRef(null);

  const { addTx } = useLocalTxHistory();


  const readChainId = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    return Number(net.chainId);
  }, []);


  const ensureContract = useCallback(async () => {
    if (!window.ethereum) throw new Error("MetaMask not found");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);

    const signer = await provider.getSigner();
    const signerAddress = await signer.getAddress();

    const addrs = getAddresses(currentChainId);
    const factoryAddress = addrs?.WalletFactory;

    if (!factoryAddress) {
      throw new Error(`Missing WalletFactory address for chainId=${currentChainId}`);
    }

    const mustReinit =
      !providerRef.current ||
      !signerRef.current ||
      !contractRef.current ||
      signerRef.current.address !== signerAddress ||
      chainIdRef.current !== currentChainId;

    if (mustReinit) {
      providerRef.current = provider;
      signerRef.current = signer;
      chainIdRef.current = currentChainId;

      contractRef.current = new ethers.Contract(
        factoryAddress,
        factoryAbi.abi,
        signer
      );


      setWallets([]);
      setBalances({});

      console.log(
        "WalletFactory reinitialized for:",
        signerAddress,
        "chainId:",
        currentChainId,
        "factory:",
        factoryAddress
      );
    }

    return contractRef.current;
  }, []);


  const fetchWallets = useCallback(async () => {
    if (!account) return [];
    try {
      const contract = await ensureContract();
      const list = await contract.getUserWallets(account);
      setWallets(list);
      return list;
    } catch (err) {
      console.error("fetchWallets error:", err);
      setWallets([]);
      return [];
    }
  }, [account, ensureContract]);


  const fetchBalances = useCallback(async (list) => {
    if (!list || !list.length) {
      setBalances({});
      return;
    }
    try {
      const provider =
        providerRef.current || new ethers.BrowserProvider(window.ethereum);

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


  const createWallet = useCallback(async () => {
    if (!account) return;

    try {
      setIsBusy(true);

      const contract = await ensureContract();


      const currentChainId = await readChainId();
      const { WalletFactory: factoryAddress } = getAddresses(currentChainId);

      const tx = await contract.createWallet();

      addTx({
        hash: tx.hash,
        from: account,
        to: factoryAddress,
        amount: 0,
        timestamp: new Date().toISOString(),
        status: "pending_wallet_creation",
        type: "WALLET_CREATE",
      });

      await tx.wait();

      const list = await fetchWallets();
      await fetchBalances(list);

      addTx({
        hash: tx.hash,
        from: factoryAddress,
        to: list[list.length - 1] || "unknown_wallet",
        amount: 0,
        timestamp: new Date().toISOString(),
        status: "wallet_created",
        type: "WALLET_CREATE",
      });
    } catch (err) {
      console.error("createWallet error:", err);

      addTx({
        hash: err?.transaction?.hash || "N/A",
        from: account,
        to: "WalletFactory",
        amount: 0,
        timestamp: new Date().toISOString(),
        status: "error_wallet_creation",
        type: "WALLET_CREATE",
      });
    } finally {
      setIsBusy(false);
    }
  }, [account, ensureContract, fetchWallets, fetchBalances, addTx, readChainId]);


  const refresh = useCallback(async () => {
    const list = await fetchWallets();
    await fetchBalances(list);
  }, [fetchWallets, fetchBalances]);


  useEffect(() => {
    let alive = true;

    const start = async () => {
      if (!account) return;

      const list = await fetchWallets();
      if (!alive) return;

      await fetchBalances(list);

      if (balanceTimerRef.current) clearInterval(balanceTimerRef.current);


      balanceTimerRef.current = setInterval(async () => {
        if (!alive) return;

        await fetchBalances(walletsRef.current);
      }, 10000);
    };

    start();

    return () => {
      alive = false;
      if (balanceTimerRef.current) clearInterval(balanceTimerRef.current);
    };

  }, [account]);


  const walletsRef = useRef([]);
  useEffect(() => {
    walletsRef.current = wallets;
  }, [wallets]);


  useEffect(() => {
    let contract;
    let handler;
    let cancelled = false;

    const attachListener = async () => {
      if (!account) return;
      if (!window.ethereum) return;

      try {
        const currentChainId = await readChainId();
        const key = `${currentChainId}:${account.toLowerCase()}`;
        if (listenerKeyRef.current === key) return;

        contract = await ensureContract();
        listenerKeyRef.current = key;

        handler = async (user, newWallet) => {
          if (cancelled) return;
          if (!account) return;
          if (String(user).toLowerCase() !== account.toLowerCase()) return;

          addTx({
            hash: `event-${currentChainId}-${newWallet.slice(2, 10)}`,
            from: "WalletFactory",
            to: newWallet,
            amount: 0,
            timestamp: new Date().toISOString(),
            status: "wallet_created_event",
            type: "WALLET_CREATE",
          });

          await refresh();
        };

        contract.on("WalletCreated", handler);
        console.log("WalletCreated listener attached:", key);
      } catch (e) {
        console.warn("Event binding failed:", e?.message);
      }
    };

    attachListener();

    return () => {
      cancelled = true;
      try {
        if (contract && handler) {
          contract.off("WalletCreated", handler);
          console.log("WalletCreated listener removed");
        }
      } catch (err) {
        console.warn("Error detaching listener:", err.message);
      }
      listenerKeyRef.current = null;
    };
  }, [account, ensureContract, refresh, addTx, readChainId]);

  return { wallets, balances, isBusy, createWallet, refresh };
}

