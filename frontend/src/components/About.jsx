import React, { useEffect, useState, useRef } from "react";
import Tilt from "react-parallax-tilt";
import { motion } from "framer-motion";
import { styles } from "../styles";
import { fadeIn, textVariant } from "../utils/motion";
import { FaWallet, FaCubes, FaEthereum } from "react-icons/fa";
import { SiChainlink } from "react-icons/si";

// EtherConnect
const services = [
  { title: "Smart Wallets", icon: <FaWallet size={48} color="white" /> },
  { title: "dApp Integration", icon: <FaCubes size={48} color="white" /> },
  { title: "Chainlink Feeds", icon: <SiChainlink size={48} color="white" /> },
  { title: "ETH Transfers", icon: <FaEthereum size={48} color="white" /> },
];

const ServiceCard = ({ index, title, icon }) => (
  <Tilt
    className="w-full"
    tiltMaxAngleX={10}
    tiltMaxAngleY={10}
    scale={1.02}
    transitionSpeed={800}
  >
    <motion.div
      variants={fadeIn("right", "spring", 0.2 * index, 0.75)}
      className="bg-gradient-to-r from-[#6b3aff] via-[#915eff] to-[#6b3aff] p-[2px] rounded-[20px]
                 shadow-[0_0_25px_rgba(145,94,255,0.3)] hover:shadow-[0_0_40px_rgba(145,94,255,0.5)]
                 transition-all duration-300 h-full"
    >
      <div className="bg-[#0b0b16] rounded-[20px] py-7 px-8 sm:px-10 min-h-[260px] sm:min-h-[280px] flex justify-evenly items-center flex-col">
        <div className="text-white">{icon}</div>
        <h3 className="text-white text-[18px] sm:text-[20px] font-bold text-center mt-3">
          {title}
        </h3>
      </div>
    </motion.div>
  </Tilt>
);

const EthPrice = () => {
  const [price, setPrice] = useState(null);
  const [trend, setTrend] = useState(null); // "up" | "down" | null

  const containerRef = useRef(null);
  const lastPriceRef = useRef(null);

  // floating logo
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const velRef = useRef({ x: 1.2, y: 1 });

  useEffect(() => {
    const moveLogo = () => {
      setPos((prev) => {
        if (!containerRef.current) return prev;

        const box = containerRef.current.getBoundingClientRect();
        const size = 40;

        let newX = prev.x + velRef.current.x;
        let newY = prev.y + velRef.current.y;

        // bounds are centered, so use half width/height
        const minX = -box.width / 2 + size / 2;
        const maxX = box.width / 2 - size / 2;
        const minY = -box.height / 2 + size / 2;
        const maxY = box.height / 2 - size / 2;

        if (newX <= minX || newX >= maxX) velRef.current.x *= -1;
        if (newY <= minY || newY >= maxY) velRef.current.y *= -1;

        return { x: newX, y: newY };
      });
    };

    const interval = setInterval(moveLogo, 25);
    return () => clearInterval(interval);
  }, []);

  // price fetch (less spammy)
  useEffect(() => {
    let alive = true;

    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
        );
        const data = await res.json();
        const newPrice = parseFloat(data.price);

        if (!alive || Number.isNaN(newPrice)) return;

        const last = lastPriceRef.current;
        if (last !== null && last !== undefined) {
          if (newPrice > last) setTrend("up");
          else if (newPrice < last) setTrend("down");
          // se uguale, non cambiare trend (evita flicker)
        }

        setPrice(newPrice);
        lastPriceRef.current = newPrice;
      } catch (err) {
        console.error("Error fetching ETH price:", err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 5000); // 5s (più stabile)
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, []);

  const color =
    trend === "up"
      ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]"
      : trend === "down"
      ? "text-red-400 drop-shadow-[0_0_10px_rgba(248,113,113,0.6)]"
      : "text-white";

  return (
    <motion.div
      ref={containerRef}
      animate={{
        scale: trend ? [1, 1.03, 1] : 1,
        rotateY:
          trend === "up" ? [0, 8, 0] : trend === "down" ? [0, -8, 0] : 0,
      }}
      transition={{ duration: 0.4 }}
      className="
        relative overflow-hidden
        w-full max-w-[260px] h-[220px]
        sm:w-60 sm:h-60
        bg-[#0b0b16]/80 backdrop-blur-md rounded-2xl
        border border-[#2b2b3d]
        shadow-[0_0_25px_rgba(145,94,255,0.25)]
        flex flex-col items-center justify-center
      "
    >
      <motion.img
        src="/icons/eth_logo.png"
        alt="ETH"
        className="absolute w-10 h-10 opacity-20"
        style={{ translateX: pos.x, translateY: pos.y }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
      />

      <h3 className="text-gray-400 text-sm font-medium mb-2 z-10">ETH/USD</h3>
      <p className={`text-[26px] sm:text-[28px] font-extrabold transition-all duration-300 z-10 ${color}`}>
        {price
          ? `$${price.toLocaleString("en-US", { minimumFractionDigits: 2 })}`
          : "Loading..."}
      </p>

      <p className="mt-2 text-[11px] text-gray-500 z-10">
        Updates every ~5s
      </p>
    </motion.div>
  );
};

const About = () => {
  return (
    <section
      id="about"
      className="max-w-7xl mx-auto px-4 sm:px-6 mt-24 sm:mt-32 pb-20 sm:pb-24 relative z-20 bg-[#060816]"
    >
      {/* Header row */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
        <div className="max-w-3xl">
          <motion.div variants={textVariant()}>
            <p className={styles.sectionSubText}>
              <span className="text-[#915eff]">Introduction</span>
            </p>
            <h2 className={styles.sectionHeadText}>
              This is <span className="text-[#915eff]">Ether</span>Connect.
            </h2>
          </motion.div>

          <motion.p
            variants={fadeIn("", "", 0.1, 1)}
            className="mt-4 text-secondary text-[16px] sm:text-[17px] max-w-3xl leading-[28px] sm:leading-[30px]"
          >
            A decentralized hub built on{" "}
            <span className="text-[#915eff] font-semibold">Ethereum</span>,
            connecting users and wallets through secure and transparent
            interactions.{" "}
            <span className="text-[#915eff] font-semibold">Ether</span>Connect
            allows individuals to experience the future of{" "}
            <span className="text-[#915eff] font-semibold">
              swaps and transactions
            </span>{" "}
            with Ethereum.
          </motion.p>
        </div>

        {/* ETH price box */}
        <div className="lg:pt-2 flex justify-start lg:justify-end">
          <EthPrice />
        </div>
      </div>

      {/* Services */}
      <div className="mt-14 sm:mt-20 pb-10 sm:pb-[100px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {services.map((service, index) => (
            <ServiceCard key={service.title} index={index} {...service} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default About;

