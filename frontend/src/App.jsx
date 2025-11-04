import { useState } from "react";
import { ethers } from "ethers";

function App() {
  const [account, setAccount] = useState(null);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("⚠️ Installa MetaMask prima di continuare");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
    } catch (error) {
      console.error(error);
      alert("Errore durante la connessione al wallet");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">🦊 MetaMask Connection Test</h1>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl text-lg font-semibold transition"
        >
          Connect Wallet
        </button>
      ) : (
        <div className="text-center">
          <p className="text-lg">Connected:</p>
          <p className="font-mono text-green-400 mt-2">{account}</p>
        </div>
      )}
    </div>
  );
}

export default App;

