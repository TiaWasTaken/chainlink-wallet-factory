import { useState, useEffect } from "react";

const STORAGE_KEY = "tx_history";
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

  // deduzione asset/flow dai type storici che usi già (BUY_USDC / SELL_USDC ecc)
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
      amountOut: tx.amountOut ?? null, // se non c'è, rimane null
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

  // default: trattiamo come trasferimento ETH (vecchio comportamento)
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

export default function useLocalTxHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJsonParse(saved, []);
    const normalized = Array.isArray(parsed)
      ? parsed.map(normalizeTx).filter(Boolean)
      : [];
    return normalized;
  });

  // persist + migrate once
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_ITEMS)));
  }, [history]);

  // Aggiunge una transazione, rimuove le pending duplicate e mantiene max 10
  const addTx = (tx) => {
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
  };

  const clearTx = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return { history, addTx, clearTx };
}

