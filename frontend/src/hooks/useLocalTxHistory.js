import { useState, useEffect } from "react";

const STORAGE_KEY = "tx_history";

export default function useLocalTxHistory() {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Aggiunge una transazione, rimuove le pending duplicate e mantiene max 10
  const addTx = (tx) => {
    setHistory((prev) => {
      let updated = [...prev];

      // Se arriva una transazione di successo, rimuovi quella pending con stesso hash o stesso tipo
      if (
        tx.status === "wallet_created" ||
        tx.status === "wallet_created_event" ||
        tx.status === "success"
      ) {
        updated = updated.filter(
          (t) =>
            !(
              t.status.startsWith("pending") &&
              (t.hash === tx.hash || t.to === tx.to)
            )
        );
      }

      // Aggiungi la nuova transazione in cima
      updated = [tx, ...updated];

      // Mantieni solo le 10 più recenti
      updated = updated.slice(0, 10);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearTx = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHistory([]);
  };

  return { history, addTx, clearTx };
}

