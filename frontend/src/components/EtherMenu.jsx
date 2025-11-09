// src/components/EtherMenu.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Factory,
  Repeat,
  Gauge,
  Link,
  History,
} from "lucide-react";
import WalletList from "./actions/WalletList";
import SendEth from "./SendEth";

const SectionPlaceholder = ({ title }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 20 }}
    transition={{ duration: 0.35 }}
    className="mt-12 text-center text-gray-300 text-lg"
  >
    <p className="mb-2 font-medium">{title}</p>
    <div className="h-64 w-full bg-[#151520]/50 border border-[#2b2b3d] rounded-2xl flex items-center justify-center backdrop-blur-md">
      <span className="text-gray-500">Component content will appear here</span>
    </div>
  </motion.div>
);

export default function EtherMenu({ account, setActiveWallet }) {
  const [selected, setSelected] = useState(null);

  // ✅ Scambiato ordine: Wallets prima di Send ETH
  const menuItems = [
    { id: "wallets", label: "Wallets & Factory", icon: <Factory size={20} /> },
    { id: "send", label: "Send ETH", icon: <Send size={20} /> },
    { id: "swap", label: "Token Swap", icon: <Repeat size={20} /> },
    { id: "gas", label: "Gas Tracker", icon: <Gauge size={20} /> },
    { id: "oracle", label: "Oracle Price", icon: <Link size={20} /> },
    { id: "history", label: "Tx History", icon: <History size={20} /> },
  ];

  const renderSection = () => {
    switch (selected) {
      case "wallets":
        return <WalletList account={account} setActiveWallet={setActiveWallet} />;
      case "send":
        return <SendEth />;
      default:
        return (
          <SectionPlaceholder
            title={menuItems.find((i) => i.id === selected)?.label || "Select an option"}
          />
        );
    }
  };

  return (
    <section className="relative w-full py-24 flex flex-col items-center text-white overflow-hidden">
      {/* 🌌 Soft gradient background */}
      <motion.div
        className="absolute top-[250px] left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full bg-[radial-gradient(circle_at_center,_rgba(145,94,255,0.12)_0%,_rgba(0,0,0,0)_70%)] blur-3xl z-0"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* 🧭 Title */}
      <motion.h2
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-semibold text-white mb-10 tracking-tight z-10"
      >
        Explore the App
      </motion.h2>

      {/* 🔘 Command Bar */}
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 flex flex-wrap justify-center gap-8 bg-[#12122b]/70 backdrop-blur-lg px-10 py-8 rounded-2xl shadow-[0_0_25px_rgba(145,94,255,0.15)] border border-[#2b2b3d]"
      >
        {menuItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => setSelected((prev) => (prev === item.id ? null : item.id))}
            whileHover={{
              scale: 1.07,
              boxShadow: "0 0 18px rgba(145,94,255,0.3)",
            }}
            whileTap={{ scale: 0.95 }}
            animate={
              selected === item.id
                ? { scale: [1, 1.02, 1], transition: { repeat: Infinity, duration: 2 } }
                : {}
            }
            className={`relative overflow-hidden flex flex-col items-center justify-center gap-2 w-36 h-28 rounded-xl transition-all duration-300 ${
              selected === item.id
                ? "bg-gradient-to-b from-[#6b3aff]/80 to-[#915eff]/70 text-white shadow-[0_0_25px_rgba(145,94,255,0.4)]"
                : "bg-[#1b1b2a]/80 hover:bg-[#252540]/80 text-gray-400"
            }`}
          >
            <motion.span
              className="absolute inset-0 rounded-xl bg-[#915eff]/20 opacity-0"
              whileHover={{ opacity: [0, 0.3, 0], scale: [1, 1.3, 1] }}
              transition={{ duration: 1 }}
            />
            <div>{item.icon}</div>
            <span className="text-sm font-medium text-center leading-tight">
              {item.label}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* 🎬 Section below */}
      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 25 }}
            transition={{ duration: 0.4 }}
            className="w-full flex justify-center mt-12"
          >
            {renderSection()}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

