
import React, { useEffect } from "react";
import { useAccount } from "wagmi";

import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import About from "../components/About";
import EtherMenu from "../components/EtherMenu";
import Footer from "../components/Footer";

export default function Home() {
  const { isConnected } = useAccount();


  useEffect(() => {
    if (!isConnected) {
      window.location.replace("/");
    }
  }, [isConnected]);


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

      <div
        id="toast"
        className="fixed top-6 right-6 z-50 px-4 py-2 bg-[#151520]/80 text-gray-100 rounded-lg shadow-lg border border-[#2b2b3d] opacity-0 transition-opacity duration-500"
      />


      <Navbar variant="home" />

      <Hero />
      <About />


      <EtherMenu />

      <Footer />
    </div>
  );
}

