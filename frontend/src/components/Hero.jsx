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
      {/* === Wrapper interno === */}
      <div
        className={`${styles.paddingX} absolute inset-0 top-[140px] max-w-7xl mx-auto flex flex-row items-start gap-5`}
      >
        {/* Side accent line */}
        <div className="flex flex-col justify-center items-center mt-5">
          <div className="w-5 h-5 rounded-full bg-[#915eff]" />
          <div className="w-1 sm:h-80 h-40 bg-gradient-to-b from-[#915eff] to-transparent" />
        </div>

        {/* Text content */}
        <div className="z-50 mt-6">
          <h1 className={`${styles.heroHeadText} text-white`}>
            Hi, I'm <span className="text-[#915eff]">Mattia</span>
          </h1>
          <p
            className={`${styles.heroSubText} mt-2 text-white-100 text-[16px]`}
          >
            I'm a <span className="text-[#915eff]">20 years old</span> web
            developer, <br className="sm:block hidden" /> based in{" "}
            <span className="text-[#915eff]">Italy</span>.
          </p>

          {/* Socials */}
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

      {/* === 3D model === */}
      <div className="relative z-0 mt-[-40px] mb-[-40px]">
        <ComputersCanvas />
      </div>

      {/* === Scroll indicator === */}
      <div className="absolute xs:bottom-10 bottom-28 w-full flex justify-center items-center z-10">
        <a href="#about" className="relative">
          <div className="w-[35px] h-[64px] rounded-3xl border-4 border-[#915eff] hover:border-white flex justify-center items-center cursor-pointer">
            <motion.div
              animate={{ y: [-10, 15, -10] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                repeatType: "loop",
              }}
              className="w-3 h-3 rounded-full bg-[#915eff] mb-1"
            />
          </div>
        </a>
      </div>
    </section>
  );
};

export default Hero;

