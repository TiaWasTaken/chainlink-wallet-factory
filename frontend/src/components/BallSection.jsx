// src/sections/BallSection.jsx
import React from "react";
import BallCanvas from "../canva/Ball";

const balls = [
  { name: "Send ETH", icon: "/icons/eth_placeholder.png", link: "/sendeth" },
  { name: "Wallet Factory", icon: "/icons/factory_placeholder.png", link: "/factory" },
  { name: "Oracle Price", icon: "/icons/chainlink_placeholder.png", link: "/oracle" },
  { name: "Token Swap", icon: "/icons/swap_placeholder.png", link: "/swap" },
];

const BallSection = () => {
  return (
    <section
      id="services"
      className="w-full py-24 bg-gradient-to-b from-[#0f0f1a] to-[#12122b] text-center"
    >
      <h2 className="text-4xl font-bold text-white mb-12">
        Explore the App
      </h2>

      <div className="flex flex-wrap justify-center gap-12">
        {balls.map((ball, index) => (
          <div
            key={index}
            onClick={() => (window.location.href = ball.link)}
            className="cursor-pointer flex flex-col items-center hover:scale-105 transition-transform"
          >
            <div className="w-[120px] h-[120px] mb-4">
              <BallCanvas icon={ball.icon} />
            </div>
            <p className="text-white font-medium text-lg">{ball.name}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default BallSection;

