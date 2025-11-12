import React from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock3,
  Hammer,
  Trash2,
} from "lucide-react";
import useLocalTxHistory from "../../hooks/useLocalTxHistory";

export default function TransactionHistory() {
  const { history, clearTx } = useLocalTxHistory();

  // Mappa status → stile
  const getStatusStyle = (status) => {
    switch (status) {
      case "success":
      case "wallet_created":
      case "wallet_created_event":
        return {
          color: "text-green-300",
          bg: "bg-green-500/10",
          border: "border-green-500/30",
          icon: <CheckCircle2 size={16} />,
          label: "Completed",
        };
      case "pending_wallet_creation":
        return {
          color: "text-yellow-300",
          bg: "bg-yellow-500/10",
          border: "border-yellow-500/30",
          icon: <Clock3 size={16} />,
          label: "Pending",
        };
      case "error_wallet_creation":
      case "error":
        return {
          color: "text-red-300",
          bg: "bg-red-500/10",
          border: "border-red-500/30",
          icon: <XCircle size={16} />,
          label: "Failed",
        };
      default:
        return {
          color: "text-gray-300",
          bg: "bg-gray-500/10",
          border: "border-gray-500/30",
          icon: <Hammer size={16} />,
          label: status,
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-[600px] bg-[#151520]/80 backdrop-blur-md border border-[#2b2b3d] rounded-2xl shadow-lg p-6 text-white"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Local Transaction History</h3>
        <button
          onClick={clearTx}
          className="text-sm px-3 py-1.5 rounded-lg bg-[#1b1b2a] border border-[#2b2b3d] hover:bg-[#23233a] transition"
        >
          <Trash2 size={14} className="inline mr-1" /> Clear
        </button>
      </div>

      {history.length === 0 ? (
        <p className="text-gray-400 text-sm">No local transactions yet.</p>
      ) : (
        <div className="max-h-[500px] overflow-y-auto overflow-x-hidden hide-scrollbar">
          <ul className="space-y-4">
            {history.map((tx, i) => {
              const s = getStatusStyle(tx.status);
              return (
                <li
                  key={i}
                  className="flex items-center justify-between border-b border-[#2b2b3d] pb-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-md border ${s.border} ${s.bg} ${s.color}`}
                    >
                      {s.icon}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {tx.amount} ETH → {tx.to.slice(0, 6)}…{tx.to.slice(-4)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs font-medium ${s.color}`}>
                    {s.label}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Scrollbar invisibile */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </motion.div>
  );
}

