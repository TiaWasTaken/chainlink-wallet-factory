// src/components/EtherWheelSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import EtherWheel from "./EtherWheel";

// Azioni reali
import WalletsFactory from "./actions/WalletsFactory";
import SendEth from "./SendEth"; // già pronto da te

const Placeholder = ({ title }) => (
  <div className="mt-10 text-gray-400 text-lg text-center italic">
    {title} – Coming soon...
  </div>
);

const EtherWheelSection = ({ account }) => {
  const [selectedAction, setSelectedAction] = useState(null);

  const renderSelected = () => {
    switch (selectedAction?.id) {
      case "wallets":
        return <WalletsFactory account={account} />;
      case "send":
        return <SendEth />;
      case "swap":
        return <Placeholder title="🔄 Token Swap" />;
      case "history":
        return <Placeholder title="📜 Transaction History" />;
      case "oracle":
        return <Placeholder title="🔗 Chainlink Oracle Feed" />;
      case "gas":
        return <Placeholder title="⛽ Gas Tracker" />;
      default:
        return (
          <p className="text-gray-400 mt-10 text-center text-lg">
            Select an operation from the wheel ⚙️
          </p>
        );
    }
  };

  return (
    <section className="w-full py-24 bg-gradient-to-b from-[#0f0f1a] to-[#12122b] text-center">
      <h2 className="text-4xl font-bold text-white mb-12">Ether Wheel</h2>

      {/* Ruota delle azioni */}
      <EtherWheel onSelect={setSelectedAction} />

      {/* Contenuto dinamico sotto */}
      <motion.div
        key={selectedAction?.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mt-12"
      >
        {renderSelected()}
      </motion.div>
    </section>
  );
};

export default EtherWheelSection;

