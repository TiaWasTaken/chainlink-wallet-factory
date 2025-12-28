import { useEffect, useMemo, useRef, useState } from "react";
import { ethers } from "ethers";
import ethLogo from "../assets/eth_logo.png";

import addresses from "../abi/addresses.json";
import USDCMockABI from "../abi/USDCMock.json";
import MockV3AggregatorABI from "../abi/MockV3Aggregator.json";

export default function Navbar({ account, setAccount, variant = "home" }) {
  const [balance, setBalance] = useState(null);
  const [prevBalance, setPrevBalance] = useState(null);

  const [usdcBalance, setUsdcBalance] = useState(null);
  const [ethUsdPrice, setEthUsdPrice] = useState(null); // 1 ETH = X USDC (USD)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);

  const [avatar, setAvatar] = useState(null);

  const [showMenu, setShowMenu] = useState(false); // avatar dropdown
  const [showBalances, setShowBalances] = useState(false); // saldo popover

  const dropdownRef = useRef(null);

  const provider = useMemo(() => {
    if (!window.ethereum) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, []);

  const usdcContract = useMemo(() => {
    if (!provider) return null;
    // read-only con provider va benissimo per balanceOf
    return new ethers.Contract(addresses.USDCMock, USDCMockABI.abi, provider);
  }, [provider]);

  const aggContract = useMemo(() => {
    if (!provider) return null;
    return new ethers.Contract(
      addresses.MockV3Aggregator,
      MockV3AggregatorABI.abi,
      provider
    );
  }, [provider]);

  // Avatar random (evita src="")
  useEffect(() => {
    if (!account) {
      setAvatar(null);
      return;
    }
    const totalAvatars = 5;
    const randomIndex = Math.floor(Math.random() * totalAvatars) + 1;
    setAvatar(`/avatars/avatar${randomIndex}.png`);
  }, [account]);

  const fetchEthBalance = async () => {
    if (!provider || !account) return;
    const balanceWei = await provider.getBalance(account);
    const newBalance = Number(ethers.formatEther(balanceWei));
    setPrevBalance((prev) => (prev === null ? newBalance : balance));
    setBalance(newBalance);
  };

  const fetchUsdcBalance = async () => {
    if (!usdcContract || !account) return;
    // USDCMock ha 6 decimali
    const raw = await usdcContract.balanceOf(account);
    setUsdcBalance(Number(ethers.formatUnits(raw, 6)));
  };

  const fetchEthUsdPrice = async () => {
    if (!aggContract) return;

    // MockV3Aggregator.latestRoundData() => int256 answer
    const roundData = await aggContract.latestRoundData();
    const answer = roundData[1]; // BigInt in ethers v6
    const decimals = await aggContract.decimals(); // uint8 -> number (ethers v6 spesso number)

    if (answer <= 0n) throw new Error("Invalid price from aggregator");

    const dec = typeof decimals === "bigint" ? Number(decimals) : Number(decimals);

    // normalizziamo sempre a 1e8
    let normalized1e8;
    if (dec === 8) {
      normalized1e8 = answer; // BigInt
    } else if (dec > 8) {
      normalized1e8 = answer / 10n ** BigInt(dec - 8);
    } else {
      normalized1e8 = answer * 10n ** BigInt(8 - dec);
    }

    const price = Number(normalized1e8) / 1e8; // 1 ETH in USD
    setEthUsdPrice(price);
  };

  const refreshAll = async () => {
    if (!account || !provider) return;
    try {
      await Promise.all([fetchEthBalance(), fetchUsdcBalance(), fetchEthUsdPrice()]);
      setLastUpdatedAt(new Date());
    } catch (err) {
      console.error("Navbar refresh error:", err);
    }
  };

  // Refresh ogni 10s
  useEffect(() => {
    if (!account || !provider) return;
    refreshAll();

    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, provider, usdcContract, aggContract]);

  // Chiudi menu cliccando fuori (sia dropdown avatar che popover saldo)
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

  // (Bonus utile) se cambia account in MetaMask: aggiorna
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accs) => {
      const next = accs?.[0];
      if (!next) return;
      setAccount(next);
      setShowMenu(false);
      setShowBalances(false);
    };

    const handleChainChanged = () => {
      // ricarica dati su chain switch
      setShowMenu(false);
      setShowBalances(false);
      setTimeout(() => refreshAll(), 300);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAccount, account]);

  // Logout
  const disconnectWallet = () => {
    try {
      setShowMenu(false);
      setShowBalances(false);
      setAccount(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } catch (e) {
      console.error("Disconnect error:", e);
      window.location.href = "/";
    }
  };

  const handleLogoClick = () => {
    if (variant === "home" && account) window.location.href = "/home";
  };

  const balanceChanged =
    prevBalance !== null && balance !== null && prevBalance !== balance;

  const shortAccount = account
    ? `${account.slice(0, 8)}…${account.slice(-6)}`
    : "";

  const oneEthInUsdc = ethUsdPrice ? ethUsdPrice : null;
  const oneUsdcInEth = ethUsdPrice ? 1 / ethUsdPrice : null;

  return (
    <nav
      className="w-full flex justify-between items-center px-8 py-4 fixed top-0 left-0 z-[9999]
      backdrop-blur-xl bg-[#0d0d16]/70 border-b-0
      shadow-[0_4px_30px_rgba(0,0,0,0.4)] ring-1 ring-white/5 rounded-none"
    >
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

      {variant === "home" && account && (
        <div className="flex items-center gap-5" ref={dropdownRef}>
          {/* BALANCE (click -> popover) */}
          <div className="relative">
            <button
              type="button"
              onClick={async () => {
                const next = !showBalances;
                setShowBalances(next);
                setShowMenu(false);
                if (next) await refreshAll(); // refresh immediato quando apri
              }}
              className={`text-sm font-medium flex items-center gap-1 px-3 py-2 rounded-xl
                border transition-all duration-200
                ${
                  balanceChanged
                    ? "text-[#915eff] border-[#915eff]/30 bg-[#151520]/60"
                    : "text-gray-200 border-white/10 bg-[#151520]/40 hover:bg-[#151520]/60"
                }`}
              title="Click to view ETH/USDC balances"
            >
              Ξ {balance !== null ? balance.toFixed(4) : "0.0000"} ETH
            </button>

            {showBalances && (
              <div className="absolute right-0 top-12 w-[320px] bg-[#141422]/95 rounded-2xl shadow-xl border border-[#29293d] p-4 z-50 backdrop-blur-md">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-400">Wallet</p>
                    <p className="text-sm font-semibold text-gray-200">
                      {shortAccount}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-gray-500">
                      Refresh every 10s
                    </p>
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
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">ETH balance</span>
                    <span className="text-sm font-semibold text-white">
                      {balance !== null ? balance.toFixed(4) : "0.0000"} ETH
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">USDC balance</span>
                    <span className="text-sm font-semibold text-white">
                      {usdcBalance !== null ? usdcBalance.toFixed(2) : "0.00"}{" "}
                      USDC
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

                <button
                  onClick={async () => {
                    await refreshAll();
                  }}
                  className="mt-3 w-full bg-[#1b1b2a] text-gray-200 text-sm font-semibold rounded-xl py-2
                  border border-[#2b2b3d] hover:bg-[#23233a] transition-all"
                >
                  Refresh now
                </button>
              </div>
            )}
          </div>

          {/* AVATAR + DROPDOWN */}
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
              // fallback senza src=""
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
              <div className="absolute right-0 top-12 bg-[#141422]/95 rounded-2xl shadow-xl border border-[#29293d] w-56 p-4 z-50 backdrop-blur-md">
                <p className="text-sm text-gray-300 mb-2">Connected Wallet</p>
                <p className="text-xs font-mono text-gray-400 break-all">
                  {account}
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
        </div>
      )}
    </nav>
  );
}

