import React from "react";
import { motion } from "framer-motion";
import StarsCanvas from "../canva/Stars";

export default function Footer() {
  return (
    <footer className="relative w-full mt-32 py-16 min-h-[260px] overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-60 pointer-events-none">
        <StarsCanvas />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 mx-auto max-w-5xl text-center text-gray-300"
      >
        {/* Divider superiore */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#915eff]/40 to-transparent mb-10"></div>

        <h3 className="text-xl font-semibold text-white tracking-tight">
          Ethereum Smart Wallet System
        </h3>

        <p className="text-sm md:text-base text-gray-400 mt-2">
          Built with Hardhat • Chainlink Oracles • React + Three.js
        </p>

        {/* Links */}
        <div className="flex justify-center gap-6 mt-6 text-sm text-gray-400">
          <a href="#" className="hover:text-purple-400 transition">GitHub</a>
          <a href="#" className="hover:text-purple-400 transition">Docs</a>
          <a href="#" className="hover:text-purple-400 transition">Smart Contract</a>
        </div>

        {/* Divider inferiore */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#915eff]/30 to-transparent mt-10"></div>

        <p className="text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} – Arganetto Mattia
        </p>
      </motion.div>
    </footer>
  );
}

