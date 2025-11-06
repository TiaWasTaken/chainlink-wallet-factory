import { useState } from "react";
import { ethers } from "ethers";

export default function SendEth({ activeWallet }) {
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState(null);

  async function handleSend() {
    if (!activeWallet) {
      alert("⚠️ No active wallet selected!");
      return;
    }

    if (!to || !ethers.isAddress(to)) {
      alert("❌ Please enter a valid recipient address.");
      return;
    }

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert("❌ Please enter a valid amount in ETH.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      setTxStatus("pending");

      const tx = await signer.sendTransaction({
        to,
        value: ethers.parseEther(amount),
      });

      await tx.wait();
      console.log("✅ Transaction confirmed:", tx.hash);

      // ⚡ Forza aggiornamento balance nel WalletList
      window.dispatchEvent(new Event("refreshBalances"));
      setTxStatus("success");
    } catch (err) {
      console.error("❌ Transaction failed:", err);
      setTxStatus("error");
    }
  }

  return (
    <div className="mt-12 p-6 bg-white/70 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-sm w-[400px] flex flex-col items-center">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">💸 Send ETH</h3>

      <input
        type="text"
        placeholder="Recipient address (0x...)"
        value={to}
        onChange={(e) => setTo(e.target.value)}
        className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
      />

      <input
        type="number"
        placeholder="Amount in ETH"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 text-sm"
      />

      <button
        onClick={handleSend}
        className="px-6 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:scale-105 transition-transform duration-200"
      >
        Send ETH
      </button>

      {txStatus === "pending" && (
        <p className="mt-4 text-yellow-600 text-sm">⏳ Transaction pending...</p>
      )}
      {txStatus === "success" && (
        <p className="mt-4 text-green-600 text-sm">✅ Transaction successful!</p>
      )}
      {txStatus === "error" && (
        <p className="mt-4 text-red-600 text-sm">❌ Transaction failed.</p>
      )}
    </div>
  );
}

