import { useCallback, useEffect, useMemo, useState } from "react";
import { ethers } from "ethers";

const MAX_ITEMS = 10;

// --- helpers ---
const safeJsonParse = (raw, fallback) => {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// Migrazione retro-compatibile:
// - Se trovi vecchie tx che non hanno assetIn/assetOut, le deduci da type
// - Mantieni tx.amount come fallback
const normalizeTx = (tx) => {
  if (!tx || typeof tx !== "object") return null;

  const type = tx.type || tx.txType || "UNKNOWN";
  const status = tx.status || "unknown";

  // se già nuovo schema, ok
  if (tx.assetIn || tx.assetOut || tx.amountIn || tx.amountOut) {
    return {
      hash: tx.hash ?? "N/A",
      timestamp: tx.timestamp ?? new Date().toISOString(),
      status,
      type,
      from: tx.from ?? null,
      to: tx.to ?? null,
      wallet: tx.wallet ?? tx.from ?? null,
      recipient: tx.recipient ?? tx.to ?? null,
      assetIn: tx.assetIn ?? null,
      amountIn: tx.amountIn ?? tx.amount ?? null,
      assetOut: tx.assetOut ?? null,
      amountOut: tx.amountOut ?? null,
    };
  }

  const tUpper = String(type).toUpperCase();

  if (tUpper.includes("BUY") && tUpper.includes("USDC")) {
    return {
      hash: tx.hash ?? "N/A",
      timestamp: tx.timestamp ?? new Date().toISOString(),
      status,
      type: "SWAP_BUY_USDC",
      from: tx.from ?? null,
      to: tx.to ?? null,
      wallet: tx.wallet ?? tx.from ?? null,
      recipient: tx.recipient ?? tx.to ?? null,
      assetIn: "ETH",
      amountIn: tx.amount ?? null,
      assetOut: "USDC",
      amountOut: tx.amountOut ?? null,
    };
  }

  if (tUpper.includes("SELL") && tUpper.includes("USDC")) {
    return {
      hash: tx.hash ?? "N/A",
      timestamp: tx.timestamp ?? new Date().toISOString(),
      status,
      type: "SWAP_SELL_USDC",
      from: tx.from ?? null,
      to: tx.to ?? null,
      wallet: tx.wallet ?? tx.from ?? null,
      recipient: tx.recipient ?? tx.to ?? null,
      assetIn: "USDC",
      amountIn: tx.amount ?? null,
      assetOut: "ETH",
      amountOut: tx.amountOut ?? null,
    };
  }

  return {
    hash: tx.hash ?? "N/A",
    timestamp: tx.timestamp ?? new Date().toISOString(),
    status,
    type: tUpper.includes("WALLET") ? type : "TRANSFER_ETH",
    from: tx.from ?? null,
    to: tx.to ?? null,
    wallet: tx.wallet ?? tx.from ?? null,
    recipient: tx.recipient ?? tx.to ?? null,
    assetIn: "ETH",
    amountIn: tx.amount ?? null,
    assetOut: null,
    amountOut: null,
  };
};

// Determina la key storage in base a chainId + account.
// Se non hai account, mettiamo "anon" (ma idealmente sempre account).
const makeKey = (chainId, account) => {
  const a = (account || "anon").toLowerCase();
  return `tx_history:${String(chainId)}:${a}`;
};

export default function useLocalTxHistory(account) {
  const [chainId, setChainId] = useState(null);

  // Leggi chainId live (e aggiorna su chainChanged)
  useEffect(() => {
    let alive = true;

    const readChain = async () => {
      if (!window.ethereum) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const net = await provider.getNetwork();
        if (!alive) return;
        setChainId(Number(net.chainId));
      } catch {
        // noop
      }
    };

    readChain();

    if (window.ethereum) {
      const onChainChanged = () => {
        // dopo chain change, rileggo
        readChain();
      };
      window.ethereum.on("chainChanged", onChainChanged);
      return () => {
        alive = false;
        window.ethereum.removeListener("chainChanged", onChainChanged);
      };
    }

    return () => {
      alive = false;
    };
  }, []);

  const storageKey = useMemo(() => {
    // se chainId non c'è ancora, usiamo "unknown" per non buttare errori
    return makeKey(chainId ?? "unknown", account);
  }, [chainId, account]);

  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = safeJsonParse(saved, []);
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeTx).filter(Boolean)
      : [];
    return normalized;
  });

  // Quando cambia storageKey (account o chain), ricarica history corretta
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    const parsed = safeJsonParse(saved, []);
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeTx).filter(Boolean)
      : [];
    setHistory(normalized);
  }, [storageKey]);

  // Persist
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(history.slice(0, MAX_ITEMS)));
  }, [history, storageKey]);

  // Aggiunge una transazione, rimuove pending duplicate e mantiene max 10
  const addTx = useCallback(
    (tx) => {
      const nTx = normalizeTx(tx);
      if (!nTx) return;

      setHistory((prev) => {
        let updated = [...prev];

        // Se arriva una transazione di successo, rimuovi pending duplicate:
        // - stesso hash (se esiste)
        // - oppure stesso tipo + recipient (fallback)
        if (
          nTx.status === "wallet_created" ||
          nTx.status === "wallet_created_event" ||
          nTx.status === "success"
        ) {
          updated = updated.filter((t) => {
            const isPending = String(t.status || "").startsWith("pending");
            if (!isPending) return true;

            const sameHash =
              t.hash && nTx.hash && t.hash !== "N/A" && t.hash === nTx.hash;

            const sameKind =
              (t.type === nTx.type || t.txType === nTx.type) &&
              (t.recipient || t.to) === (nTx.recipient || nTx.to);

            return !(sameHash || sameKind);
          });
        }

        updated = [nTx, ...updated].slice(0, MAX_ITEMS);
        return updated;
      });
    },
    [setHistory]
  );

  const clearTx = useCallback(() => {
    localStorage.removeItem(storageKey);
    setHistory([]);
  }, [storageKey]);

  return { history, addTx, clearTx, chainId, storageKey };
}

