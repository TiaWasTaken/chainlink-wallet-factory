import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import ethLogo from "../assets/eth_logo.png";

import addresses from "../abi/addresses.json";
import USDCMockABI from "../abi/USDCMock.json";
import MockV3AggregatorABI from "../abi/MockV3Aggregator.json";

import { useWeb3Modal } from "@web3modal/wagmi/react";
import { useAccount, useDisconnect, useChainId } from "wagmi";

export default function Navbar({ variant = "home" }) {
  const { open } = useWeb3Modal();

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  const isHardhat = chainId === 31337;

  // --- UI state
  const [ethBalance, setEthBalance] = useState(null);
  const [prevEth, setPrevEth] = useState(null);

  const [usdcBalance, setUsdcBalance] = useState(null);
  const [ethUsdPrice, setEthUsdPrice] = useState(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [avatar, setAvatar] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showBalances, setShowBalances] = useState(false);

  const dropdownRef = useRef(null);

  const balanceChanged =
    prevEth !== null && ethBalance !== null && prevEth !== ethBalance;

  // Reset state when disconnected
  useEffect(() => {
    if (!isConnected) {
      setEthBalance(null);
      setPrevEth(null);
      setUsdcBalance(null);
      setEthUsdPrice(null);
      setLastUpdatedAt(null);
      setShowMenu(false);
      setShowBalances(false);
    }
  }, [isConnected]);

  // Random avatar
  useEffect(() => {
    if (!address) {
      setAvatar(null);
      return;
    }
    const totalAvatars = 5;
    const randomIndex = Math.floor(Math.random() * totalAvatars) + 1;
    setAvatar(`/avatars/avatar${randomIndex}.png`);
  }, [address]);

  // Deterministic provider for Hardhat reads
  const ethersProvider = useMemo(() => {
    if (!isConnected || !address) return null;
    if (!isHardhat) return null; // we only support your local chain here
    return new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  }, [isConnected, address, isHardhat]);

  const usdcContract = useMemo(() => {
    if (!ethersProvider) return null;
    return new ethers.Contract(addresses.USDCMock, USDCMockABI.abi, ethersProvider);
  }, [ethersProvider]);

  const aggContract = useMemo(() => {
    if (!ethersProvider) return null;
    return new ethers.Contract(
      addresses.MockV3Aggregator,
      MockV3AggregatorABI.abi,
      ethersProvider
    );
  }, [ethersProvider]);

  const fetchEthBalance = async () => {
    if (!ethersProvider || !address) return;
    const wei = await ethersProvider.getBalance(address);
    const val = Number(ethers.formatEther(wei));
    if (Number.isFinite(val)) {
      setPrevEth((p) => (p === null ? val : ethBalance));
      setEthBalance(val);
    }
  };

  const fetchUsdcBalance = async () => {
    if (!usdcContract || !address) return;
    const raw = await usdcContract.balanceOf(address); // 6 decimals
    setUsdcBalance(Number(ethers.formatUnits(raw, 6)));
  };

  const fetchEthUsdPrice = async () => {
    if (!aggContract) return;

    const roundData = await aggContract.latestRoundData();
    const answer = roundData[1]; // BigInt
    const decimals = await aggContract.decimals();
    const dec = typeof decimals === "bigint" ? Number(decimals) : Number(decimals);

    if (answer <= 0n) throw new Error("Invalid price from aggregator");

    let normalized1e8;
    if (dec === 8) normalized1e8 = answer;
    else if (dec > 8) normalized1e8 = answer / 10n ** BigInt(dec - 8);
    else normalized1e8 = answer * 10n ** BigInt(8 - dec);

    const price = Number(normalized1e8) / 1e8;
    setEthUsdPrice(price);
  };

  const refreshAll = async () => {
    if (!isConnected || !address || !isHardhat || !ethersProvider) return;
    try {
      await Promise.all([fetchEthBalance(), fetchUsdcBalance(), fetchEthUsdPrice()]);
      setLastUpdatedAt(new Date());
      if (ethBalance !== null) setPrevEth(ethBalance);
    } catch (err) {
      console.error("Navbar refresh error:", err);
    }
  };

  // Refresh every 10s while connected on Hardhat
  useEffect(() => {
    if (!isConnected || !address || !isHardhat || !ethersProvider) return;
    refreshAll();
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, address, isHardhat, ethersProvider]);

  // Click outside closes popovers
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowMenu(false);
        setShowBalances(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const disconnectWallet = () => {
    setShowMenu(false);
    setShowBalances(false);
    disconnect();
    window.location.href = "/";
  };

  const shortAccount = address ? `${address.slice(0, 8)}…${address.slice(-6)}` : "";
  const oneEthInUsdc = ethUsdPrice ? ethUsdPrice : null;
  const oneUsdcInEth = ethUsdPrice ? 1 / ethUsdPrice : null;

  const handleLogoClick = () => {
    if (variant === "home" && isConnected) window.location.href = "/home";
  };

  const handleBalanceClick = async () => {
    if (isConnected && !isHardhat) {
      setShowMenu(false);
      setShowBalances(false);
      await open({ view: "Networks" });
      return;
    }

    const next = !showBalances;
    setShowBalances(next);
    setShowMenu(false);
    if (next) await refreshAll();
  };

  return (
    <nav
      className="w-full fixed top-0 left-0 z-[9999]
      backdrop-blur-xl bg-[#0d0d16]/70 border-b-0
      shadow-[0_4px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/5"
    >
      {/* ✅ Desktop base = come prima | ✅ Mobile override sotto sm */}
      <div className="w-full flex justify-between items-center px-8 py-4 gap-5 max-sm:px-4 max-sm:py-3 max-sm:gap-3">
        {/* Left */}
        <div
          onClick={handleLogoClick}
          className={`flex items-center gap-3 select-none ${
            variant === "home" ? "cursor-pointer" : "cursor-default"
          }`}
        >
          <img
            src={ethLogo}
            alt="ETH"
            className="w-8 h-8 transition-transform hover:scale-110 duration-200 drop-shadow-[0_0_6px_rgba(145,94,255,0.35)]"
          />
          <h1 className="text-lg font-bold text-white">
            <span className="text-[#915eff]">Ether</span>Connect
          </h1>
        </div>

        {variant === "home" && (
          <div className="flex items-center gap-5 max-sm:gap-2" ref={dropdownRef}>
            {!isConnected ? (
              <button
                type="button"
                onClick={() => open()}
                className="text-sm font-medium px-3 py-2 rounded-xl border border-white/10 bg-[#151520]/40 hover:bg-[#151520]/60 transition-all text-gray-200"
              >
                Connect
              </button>
            ) : (
              <>
                {/* BALANCE */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={handleBalanceClick}
                    className={`text-sm font-medium flex items-center gap-1 px-3 py-2 rounded-xl
                      border transition-all duration-200
                      ${
                        balanceChanged
                          ? "text-[#915eff] border-[#915eff]/30 bg-[#151520]/60"
                          : "text-gray-200 border-white/10 bg-[#151520]/40 hover:bg-[#151520]/60"
                      }
                      max-sm:max-w-[62vw] max-sm:truncate
                    `}
                    title={
                      !isHardhat
                        ? "Wrong network — click to switch"
                        : "Click to view ETH/USDC balances"
                    }
                  >
                    {!isHardhat
                      ? "Wrong network"
                      : `Ξ ${ethBalance !== null ? ethBalance.toFixed(4) : "…"} ETH`}
                  </button>

                  {showBalances && isHardhat && (
                    <div
                      className="
                        absolute right-0 top-12 z-50
                        bg-[#141422]/95 rounded-2xl shadow-xl border border-[#29293d] p-4 backdrop-blur-md
                        w-[360px]
                        max-sm:w-[92vw] max-sm:max-w-[360px]
                      "
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-400">Wallet</p>
                          <button
                            className="text-sm font-semibold text-gray-200 max-w-[260px] truncate"
                            onClick={() => open({ view: "Account" })}
                            title="Open account"
                          >
                            {shortAccount}
                          </button>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-500">Refresh every 10s</p>
                          <p className="text-[11px] text-gray-400">
                            {lastUpdatedAt
                              ? `Updated: ${lastUpdatedAt.toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                })}`
                              : "Updated: —"}
                          </p>
                        </div>
                      </div>

                      <div className="bg-[#10101a] border border-white/5 rounded-xl p-3 mb-3">
                        <div className="flex justify-between items-center gap-3">
                          <span className="text-xs text-gray-400">ETH balance</span>
                          <span className="text-sm font-semibold text-white">
                            {ethBalance !== null ? ethBalance.toFixed(4) : "…"} ETH
                          </span>
                        </div>
                        <div className="flex justify-between items-center mt-2 gap-3">
                          <span className="text-xs text-gray-400">USDC balance</span>
                          <span className="text-sm font-semibold text-white">
                            {usdcBalance !== null ? usdcBalance.toFixed(2) : "…"} USDC
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-[#10101a] border border-white/5 rounded-xl p-3">
                          <p className="text-[11px] text-gray-400">1 ETH</p>
                          <p className="text-base font-semibold text-white">
                            {oneEthInUsdc ? `${oneEthInUsdc.toFixed(2)} USDC` : "—"}
                          </p>
                        </div>
                        <div className="bg-[#10101a] border border-white/5 rounded-xl p-3">
                          <p className="text-[11px] text-gray-400">1 USDC</p>
                          <p className="text-base font-semibold text-white">
                            {oneUsdcInEth ? `${oneUsdcInEth.toFixed(8)} ETH` : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={refreshAll}
                          className="w-full bg-[#1b1b2a] text-gray-200 text-sm font-semibold rounded-xl py-2
                          border border-[#2b2b3d] hover:bg-[#23233a] transition-all"
                        >
                          Refresh
                        </button>
                        <button
                          onClick={() => open({ view: "Networks" })}
                          className="w-full bg-[#1b1b2a] text-gray-200 text-sm font-semibold rounded-xl py-2
                          border border-[#2b2b3d] hover:bg-[#23233a] transition-all"
                        >
                          Network
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* AVATAR */}
                <div className="relative">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt="avatar"
                      className="w-10 h-10 rounded-full border border-[#915eff]/60 shadow-[0_0_10px_rgba(145,94,255,0.25)]
                      cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => {
                        setShowMenu(!showMenu);
                        setShowBalances(false);
                      }}
                    />
                  ) : (
                    <div
                      onClick={() => {
                        setShowMenu(!showMenu);
                        setShowBalances(false);
                      }}
                      className="w-10 h-10 rounded-full border border-[#915eff]/60 bg-[#151520]
                      shadow-[0_0_10px_rgba(145,94,255,0.18)] cursor-pointer hover:scale-105 transition-transform"
                      title="Profile"
                    />
                  )}

                  {showMenu && (
                    <div
                      className="
                        absolute right-0 top-12 z-50
                        bg-[#141422]/95 rounded-2xl shadow-xl border border-[#29293d] p-4 backdrop-blur-md
                        w-56
                        max-sm:w-[92vw] max-sm:max-w-[320px]
                      "
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-300">Connected Wallet</p>
                        <button
                          className="text-xs text-gray-400 hover:text-gray-200"
                          onClick={() => open({ view: "Account" })}
                        >
                          Manage
                        </button>
                      </div>

                      <p className="text-xs font-mono text-gray-400 break-all mt-2">
                        {address}
                      </p>

                      <button
                        onClick={disconnectWallet}
                        className="mt-4 w-full bg-red-600 text-white text-sm font-semibold rounded-xl py-2 hover:bg-red-700 transition-all"
                      >
                        Disconnect
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

