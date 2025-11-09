// src/sections/InfoCards.jsx
import React from "react";

const cards = [
  {
    title: "Create Smart Wallets",
    text: "Deploy new Ethereum wallets using our factory contract — fast, secure, and gas-efficient.",
    icon: "🧱",
  },
  {
    title: "Send ETH Instantly",
    text: "Transfer ETH between any wallets on the network in seconds with a clean interface.",
    icon: "⚡",
  },
  {
    title: "Track Real-Time Prices",
    text: "Access Chainlink price feeds to stay updated on ETH/USD and other token rates.",
    icon: "📈",
  },
  {
    title: "Manage Assets Safely",
    text: "Monitor balances and recent transactions directly from your connected account.",
    icon: "🔒",
  },
];

const InfoCards = () => {
  return (
    <section
      id="cards"
      className="w-full py-20 bg-[#0f0f1a] flex flex-col items-center text-center"
    >
      <h2 className="text-4xl font-bold text-white mb-10">
        How EtherConnect Works
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl">
        {cards.map((card, index) => (
          <div
            key={index}
            className="bg-[#151526] p-8 rounded-2xl border border-purple-500/20 shadow-lg hover:shadow-purple-500/10 hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="text-5xl mb-4">{card.icon}</div>
            <h3 className="text-xl font-semibold text-white mb-2">
              {card.title}
            </h3>
            <p className="text-gray-400 text-sm leading-relaxed">{card.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default InfoCards;

