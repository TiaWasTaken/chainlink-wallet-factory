import React, { useEffect, useState, useRef } from "react";
import Tilt from "react-parallax-tilt";
import { motion, useAnimation } from "framer-motion";
import { styles } from "../styles";
import { fadeIn, textVariant } from "../utils/motion";

// 💎 Servizi EtherConnect
const services = [
  { title: "Smart Wallets", icon: "/icons/wallet.png" },
  { title: "dApp Integration", icon: "/icons/dapp.png" },
  { title: "Chainlink Feeds", icon: "/icons/chainlink_placeholder.png" },
  { title: "ETH Transfers", icon: "/icons/swap_placeholder.png" },
];

// 💫 Card effetto Tilt + bordo neon
const ServiceCard = ({ index, title, icon }) => (
  <Tilt className="xs:w-[250px] sm:w-[270px] w-full">
    <motion.div
      variants={fadeIn("right", "spring", 0.2 * index, 0.75)}
      className="bg-gradient-to-r from-[#6b3aff] via-[#915eff] to-[#6b3aff] p-[2px] rounded-[20px] shadow-[0_0_25px_rgba(145,94,255,0.3)] hover:shadow-[0_0_40px_rgba(145,94,255,0.5)] transition-all duration-300"
    >
      <div className="bg-[#151520] rounded-[20px] py-7 px-10 min-h-[280px] flex justify-evenly items-center flex-col">
        <img src={icon} alt={title} className="w-16 h-16 object-contain" />
        <h3 className="text-white text-[20px] font-bold text-center mt-3">
          {title}
        </h3>
      </div>
    </motion.div>
  </Tilt>
);

// 💰 ETH/USD live box con logo ETH "DVD-style"
const EthPrice = () => {
  const [price, setPrice] = useState(null);
  const [prevPrice, setPrevPrice] = useState(null);
  const [trend, setTrend] = useState(null);
  const logoControls = useAnimation();

  const containerRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [vel, setVel] = useState({ x: 1.2, y: 1 });

  // 🎯 Movimento tipo logo DVD
  useEffect(() => {
    const moveLogo = () => {
      setPos((prev) => {
        if (!containerRef.current) return prev;

        const box = containerRef.current.getBoundingClientRect();
        const size = 40; // dimensione logo ETH in px
        let newX = prev.x + vel.x;
        let newY = prev.y + vel.y;
        let newVel = { ...vel };

        if (newX <= -box.width / 2 + size / 2 || newX >= box.width / 2 - size / 2)
          newVel.x *= -1;
        if (newY <= -box.height / 2 + size / 2 || newY >= box.height / 2 - size / 2)
          newVel.y *= -1;

        setVel(newVel);
        return { x: newX, y: newY };
      });
    };

    const interval = setInterval(moveLogo, 25); // ~60fps
    return () => clearInterval(interval);
  }, [vel]);

  // 💵 Fetch prezzo ETH live
  useEffect(() => {
    let lastPrice = null;

    const fetchPrice = async () => {
      try {
        const res = await fetch(
          "https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT"
        );
        const data = await res.json();
        const newPrice = parseFloat(data.price);

        if (lastPrice !== null) {
          setPrevPrice(lastPrice);
          setTrend(
            newPrice > lastPrice
              ? "up"
              : newPrice < lastPrice
              ? "down"
              : trend
          );
        }

        setPrice(newPrice);
        lastPrice = newPrice;
      } catch (err) {
        console.error("Error fetching ETH price:", err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 1000);
    return () => clearInterval(interval);
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
        scale: trend ? [1, 1.05, 1] : 1,
        rotateY:
          trend === "up" ? [0, 10, 0] : trend === "down" ? [0, -10, 0] : 0,
      }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center bg-[#151520]/80 backdrop-blur-md rounded-2xl w-60 h-60 mr-24 border border-[#2b2b3d] shadow-[0_0_25px_rgba(145,94,255,0.25)] relative overflow-hidden"
    >
      {/* Logo ETH rimbalzante tipo DVD */}
      <motion.img
        src="/icons/eth_logo.png"
        alt="ETH"
        className="absolute w-10 h-10 opacity-20"
        style={{
          translateX: pos.x,
          translateY: pos.y,
        }}
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 30, ease: "linear" }}
      />

      <h3 className="text-gray-400 text-sm font-medium mb-2 z-10">ETH/USD</h3>
      <p
        className={`text-[28px] font-extrabold transition-all duration-300 z-10 ${color}`}
      >
        {price
          ? `$${price.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}`
          : "Loading..."}
      </p>
    </motion.div>
  );
};

// 🧩 Sezione About
const About = () => {
  return (
    <section
      id="about"
      className="max-w-7xl mx-auto px-6 mt-32 pb-24 relative z-20"
    >
      <div className="flex flex-row justify-between items-center">
        {/* --- Testo --- */}
        <div>
          <motion.div variants={textVariant()}>
            <p className={styles.sectionSubText}>Introduction</p>
            <h2 className={styles.sectionHeadText}>This is EtherConnect.</h2>
          </motion.div>

          <motion.p
            variants={fadeIn("", "", 0.1, 1)}
            className="mt-4 text-secondary text-[17px] max-w-3xl leading-[30px]"
          >
            A decentralized hub built on{" "}
            <span className="text-[#915eff] font-semibold">Ethereum</span>,
            connecting users, smart contracts, and dApps through secure and
            transparent interactions. Empowering developers and individuals to
            build the future of the blockchain ecosystem.
          </motion.p>
        </div>

        {/* --- Prezzo ETH --- */}
        <EthPrice />
      </div>

      {/* --- Cards dei servizi --- */}
      <div className="mt-20 flex flex-wrap gap-10 justify-center pb-[100px]">
        {services.map((service, index) => (
          <ServiceCard key={service.title} index={index} {...service} />
        ))}
      </div>
    </section>
  );
};

export default About;

