import React, { useState } from "react";
import { motion } from "framer-motion";

const sectors = [
  { id: "send", name: "Send ETH", color: "#6B3AFF", icon: "/icons/eth_placeholder.png" },
  { id: "swap", name: "Token Swap", color: "#3C3CFF", icon: "/icons/swap_placeholder.png" },
  { id: "oracle", name: "Oracle Price", color: "#00C3FF", icon: "/icons/chainlink_placeholder.png" },
  { id: "gas", name: "Gas Tracker", color: "#6E9FFF", icon: "/icons/gas_placeholder.png" },
  { id: "tx", name: "Tx History", color: "#915EFF", icon: "/icons/tx_placeholder.png" },
  { id: "wallets", name: "Wallets & Factory", color: "#2B1E73", icon: "/icons/factory_placeholder.png" },
];

const EtherWheel = ({ onSelect }) => {
  const [hovered, setHovered] = useState(null);
  const radius = 230;
  const center = 250;

  const createSectorPath = (index, total, r, cx, cy) => {
    const angle = (2 * Math.PI) / total;
    const start = index * angle - Math.PI / 2;
    const end = start + angle;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
  };

  return (
    <section className="relative w-full flex flex-col items-center justify-center py-24 text-white">
      <div className="relative">
        {/* Wheel SVG */}
        <svg width="500" height="500" viewBox="0 0 500 500">
          {sectors.map((sector, i) => (
            <motion.path
              key={sector.id}
              d={createSectorPath(i, sectors.length, radius, center, center)}
              fill={sector.color}
              initial={{ opacity: 0.85 }}
              animate={{
                opacity: hovered === sector.id ? 1 : 0.8,
                filter:
                  hovered === sector.id
                    ? `drop-shadow(0 0 25px ${sector.color})`
                    : "drop-shadow(0 0 5px rgba(0,0,0,0.2))",
                scale: hovered === sector.id ? 1.03 : 1,
              }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{
                transformOrigin: `${center}px ${center}px`,
                cursor: "pointer",
              }}
              onMouseEnter={() => setHovered(sector.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect && onSelect(sector)}
            />
          ))}
        </svg>

        {/* Icons + Labels */}
        {sectors.map((sector, i) => {
          const angle = (i / sectors.length) * 2 * Math.PI - Math.PI / 2 + Math.PI / sectors.length;
          const iconRadius = 145;
          const labelRadius = 185;
          const iconX = center + iconRadius * Math.cos(angle);
          const iconY = center + iconRadius * Math.sin(angle);
          const textX = center + labelRadius * Math.cos(angle);
          const textY = center + labelRadius * Math.sin(angle);

          return (
            <motion.div
              key={sector.id + "-icon"}
              className="absolute flex flex-col items-center"
              style={{
                left: `${iconX - 24}px`,
                top: `${iconY - 24}px`,
              }}
              onMouseEnter={() => setHovered(sector.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect && onSelect(sector)}
              animate={{
                scale: hovered === sector.id ? 1.2 : 1,
                filter:
                  hovered === sector.id
                    ? `drop-shadow(0 0 15px ${sector.color})`
                    : "drop-shadow(0 0 5px rgba(0,0,0,0.3))",
              }}
              transition={{ duration: 0.25 }}
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center bg-[#151520]"
                style={{
                  boxShadow:
                    hovered === sector.id
                      ? `0 0 20px ${sector.color}`
                      : "0 0 8px rgba(0,0,0,0.3)",
                }}
              >
                <img src={sector.icon} alt={sector.name} className="w-7 h-7" />
              </div>
              <p
                className={`text-sm mt-2 ${
                  hovered === sector.id ? "text-white font-semibold" : "text-gray-300"
                }`}
                style={{
                  position: "absolute",
                  left: `${textX - center - 30}px`,
                  top: `${textY - center + 10}px`,
                }}
              >
                {sector.name}
              </p>
            </motion.div>
          );
        })}

        {/* ETH Core */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex items-center justify-center bg-[#151520] border border-[#915eff]/70 shadow-[0_0_35px_rgba(145,94,255,0.8)]"
          whileHover={{
            scale: 1.1,
            boxShadow: "0 0 50px rgba(145,94,255,0.9)",
          }}
          transition={{ duration: 0.4 }}
        >
          <img src="/icons/eth_logo.png" alt="Ethereum Core" className="w-12 h-12 opacity-90" />
        </motion.div>
      </div>
    </section>
  );
};

export default EtherWheel;

