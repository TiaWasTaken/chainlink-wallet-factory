// src/components/actions/SendEth.jsx
import { useEffect, useState } from "react";
import { ethers } from "ethers";
import useWalletFactory from "../../hooks/useWalletFactory";
import SmartWalletABI from "../../abi/SmartWallet.json";
import useLocalTxHistory from "../../hooks/useLocalTxHistory";

import {
  Send as SendIcon,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function SendEth() {
  const [selectedAccount, setSelectedAccount] = useState("");
  const [currentAccount, setCurrentAccount] = useState("");
  const [destinationWallet, setDestinationWallet] = useState("");
  const [senderWallet, setSenderWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [advancedMode, setAdvancedMode] = useState(false);

  const {
    wallets: recipientWallets,
    balances: recipientBalances,
    refresh: refreshRecipient,
  } = useWalletFactory(selectedAccount);

  const {
    wallets: senderWallets,
    balances: senderBalances,
    refresh: refreshSender,
  } = useWalletFactory(currentAccount);

  const { addTx } = useLocalTxHistory();

  const loadAccounts = async () => {
    if (!window.ethereum) return;
    try {
      const accs = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccounts(accs);
      const active = accs[0];
      setCurrentAccount(active);
      if (!selectedAccount) setSelectedAccount(active);
    } catch (err) {
      console.error("Error loading accounts:", err);
    }
  };

  useEffect(() => {
    loadAccounts();

    const handleAccountsChanged = (accs) => {
      setAccounts(accs);
      if (accs.length > 0) {
        setCurrentAccount(accs[0]);
        if (selectedAccount === "") setSelectedAccount(accs[0]);
      }
      refreshSender();
      refreshRecipient();
    };

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
    }
  }, []);

  async function handleSend() {
    const to = destinationWallet;
    const fromAddr = advancedMode && senderWallet ? senderWallet : currentAccount;

    if (!to || !ethers.isAddress(to)) {
      alert("Please select a valid destination wallet.");
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert("Please enter a valid amount in ETH.");
      return;
    }
    if (to.toLowerCase() === fromAddr.toLowerCase()) {
      alert("You cannot send ETH to yourself.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setTxStatus("pending");

      let tx;

      if (fromAddr.toLowerCase() === currentAccount.toLowerCase()) {
        tx = await signer.sendTransaction({
          to,
          value: ethers.parseEther(amount),
        });
      } else {
        const walletContract = new ethers.Contract(fromAddr, SmartWalletABI, signer);
        tx = await walletContract.sendETH(to, ethers.parseEther(amount));
      }

      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Transaction confirmed:", tx.hash);

      addTx({
        hash: tx.hash,
        from: fromAddr,
        to,
        amount,
        timestamp: new Date().toISOString(),
        status: "success",
      });

      await Promise.all([refreshSender(), refreshRecipient()]);
      setTxStatus("success");
      setAmount("");
    } catch (err) {
      console.error("Transaction failed:", err);
      setTxStatus("error");

      addTx({
        hash: err?.transaction?.hash || "N/A",
        from: senderWallet || currentAccount,
        to: destinationWallet,
        amount,
        timestamp: new Date().toISOString(),
        status: "error",
      });
    }
  }

  return (
    <div className="mt-12 p-6 bg-[#151520]/80 backdrop-blur-md border border-[#2b2b3d] rounded-2xl shadow-lg w-[440px] flex flex-col items-center text-white">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <SendIcon size={18} className="text-purple-400" />
        Send ETH
      </h3>

      <label className="text-sm text-gray-400 self-start mb-1">Select Account</label>
      <select
        value={selectedAccount}
        onChange={(e) => {
          setSelectedAccount(e.target.value);
          setDestinationWallet("");
        }}
        className="w-full mb-4 px-4 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
      >
        <option value="">-- Choose an account --</option>
        {accounts.map((acc) => (
          <option
            key={acc}
            value={acc}
            className={
              acc.toLowerCase() === currentAccount.toLowerCase()
                ? "text-purple-400 font-semibold"
                : ""
            }
          >
            {acc.slice(0, 8)}…{acc.slice(-6)}
            {acc.toLowerCase() === currentAccount.toLowerCase() ? "  (you)" : ""}
          </option>
        ))}
      </select>

      {selectedAccount && (
        <>
          <label className="text-sm text-gray-400 self-start mb-1">
            Select Recipient (Wallet or Main Account)
          </label>
          <select
            value={destinationWallet}
            onChange={(e) => setDestinationWallet(e.target.value)}
            className="w-full mb-4 px-4 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">-- Choose recipient --</option>

            <option value={selectedAccount}>
              {selectedAccount.slice(0, 8)}…{selectedAccount.slice(-6)} — Main Account
            </option>

            {recipientWallets.map((w) => (
              <option key={w} value={w}>
                {w} — Smart Wallet — {Number(recipientBalances[w] || 0).toFixed(4)} ETH
              </option>
            ))}
          </select>
        </>
      )}

      <button
        onClick={() => setAdvancedMode((p) => !p)}
        className="text-xs text-purple-400 mb-3 hover:underline self-end flex items-center gap-1"
      >
        {advancedMode ? (
          <>
            Hide advanced options <ChevronUp size={14} />
          </>
        ) : (
          <>
            Show advanced options <ChevronDown size={14} />
          </>
        )}
      </button>

      {advancedMode && (
        <>
          <label className="text-sm text-gray-400 self-start mb-1">
            Choose Sender Wallet
          </label>
          <select
            value={senderWallet}
            onChange={(e) => setSenderWallet(e.target.value)}
            className="w-full mb-4 px-4 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          >
            <option value="">-- Use default signer (MetaMask) --</option>
            <option value={currentAccount}>
              {currentAccount.slice(0, 8)}…{currentAccount.slice(-6)} — Main Account (you)
            </option>
            {senderWallets.map((w) => (
              <option key={w} value={w}>
                {w} — Smart Wallet — {Number(senderBalances[w] || 0).toFixed(4)} ETH
              </option>
            ))}
          </select>
        </>
      )}

      {destinationWallet && (
        <>
          <input
            type="number"
            placeholder="Amount in ETH"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full mb-4 px-4 py-2 bg-[#1b1b2a] border border-[#2b2b3d] rounded-lg focus:ring-2 focus:ring-purple-500 text-sm outline-none"
          />
          <button
            onClick={handleSend}
            disabled={txStatus === "pending"}
            className={`w-full px-6 py-2 rounded-lg font-semibold shadow-sm transition-all duration-300 ${
              txStatus === "pending"
                ? "bg-gray-500 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-500 to-indigo-600 hover:scale-105"
            } flex items-center justify-center gap-2`}
          >
            {txStatus === "pending" ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Sending...
              </>
            ) : (
              <>
                <SendIcon size={16} /> Send ETH
              </>
            )}
          </button>
        </>
      )}

      {txStatus === "pending" && (
        <p className="mt-4 text-yellow-400 text-sm flex items-center gap-2">
          <Loader2 className="animate-spin" size={16} /> Transaction pending...
        </p>
      )}
      {txStatus === "success" && (
        <p className="mt-4 text-green-400 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> Transaction successful!
        </p>
      )}
      {txStatus === "error" && (
        <p className="mt-4 text-red-400 text-sm flex items-center gap-2">
          <XCircle size={16} /> Transaction failed.
        </p>
      )}
    </div>
  );
}

