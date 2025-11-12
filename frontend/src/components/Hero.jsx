import React from "react";
import { styles } from "../styles";
import { motion } from "framer-motion";
import ComputersCanvas from "../canva/Computers";
import githubLogo from "/icons/github.png";
import email from "/icons/email.png";

const Hero = () => {
  return (
    <section
      className="relative w-full h-[105vh] mx-auto bg-cover bg-no-repeat bg-center"
      style={{ backgroundImage: "url('/herobg.png')" }}
    >
      <div
        className={`${styles.paddingX} absolute inset-0 top-[140px] max-w-7xl mx-auto flex flex-row items-start gap-5`}
      >
        <div className="flex flex-col justify-center items-center mt-5">
          <div className="w-5 h-5 rounded-full bg-[#915eff]" />
          <div className="w-1 sm:h-80 h-40 bg-gradient-to-b from-[#915eff] to-transparent" />
        </div>

        <div className="z-50 mt-6">
          <h1 className={`${styles.heroHeadText} text-white`}>
            This is <span className="text-[#915eff]">Ether</span>Connect
          </h1>
          <p
            className={`${styles.heroSubText} mt-2 text-white-100 text-[16px]`}
          >
            Powered by <span className="text-[#915eff]">Ethereum </span>
            <br />Built for{" "}
            <span className="text-[#915eff]">Connection</span>
          </p>

          <div className="flex flex-row items-center space-x-4 mt-6 z-50">
            <a
              href="https://github.com/TiaWasTaken"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit GitHub"
            >
              <img
                src={githubLogo}
                alt="GitHub Logo"
                className="cursor-pointer w-8 h-8 transition-transform duration-200 ease-in-out hover:scale-110"
              />
            </a>

            <a
              href="https://mail.google.com/mail/?view=cm&to=arganetto.mattia@gmail.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Send Email"
            >
              <img
                src={email}
                alt="Email Icon"
                className="cursor-pointer w-7 h-7 transition-transform duration-200 ease-in-out hover:scale-110"
              />
            </a>
          </div>
        </div>
      </div>

      <div className="relative z-0 mt-[-40px] mb-[-40px]">
        <ComputersCanvas />
      </div>
    </section>
  );
};

export default Hero;

