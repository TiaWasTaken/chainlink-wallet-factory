// src/pages/Home.jsx
import React, { useEffect } from "react";
import { useAccount } from "wagmi";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import EtherMenu from "../components/EtherMenu";
import Footer from "../components/Footer";

export default function Home() {
  const { isConnected } = useAccount();

  // Route guard extra (oltre a quella in App.jsx): se perdi connessione, torni al login
  useEffect(() => {
    if (!isConnected) {
      window.location.replace("/");
    }
  }, [isConnected]);

  // Toast listener (ora il div esiste davvero nel DOM)
  useEffect(() => {
    const el = document.getElementById("toast");
    if (!el) return;

    const handler = (e) => {
      el.textContent = e.detail;
      el.style.opacity = "1";
      setTimeout(() => (el.style.opacity = "0"), 2500);
    };

    window.addEventListener("toast", handler);
    return () => window.removeEventListener("toast", handler);
  }, []);

  return (
    <div className="min-h-screen bg-[#060816] text-gray-200 overflow-x-hidden">
      {/* ✅ Toast mounted */}
      <div
        id="toast"
        className="fixed top-6 right-6 z-50 px-4 py-2 bg-[#151520]/80 text-gray-100 rounded-lg shadow-lg border border-[#2b2b3d] opacity-0 transition-opacity duration-500"
      />

      {/* ✅ Navbar ora prende account da wagmi internamente */}
      <Navbar variant="home" />

      <Hero />
      <About />

      {/* ✅ EtherMenu: passo successivo = togliere prop account e farlo usare wagmi */}
      <EtherMenu />

      <Footer />
    </div>
  );
}

