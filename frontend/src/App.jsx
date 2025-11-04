import { useState, useEffect } from "react";
import { ethers } from "ethers";
import factoryAbi from "./abi/WalletFactory.json";
import addresses from "./abi/addresses.json";

function App() {
  const [account, setAccount] = useState(null);
  const [wallets, setWallets] = useState([]);
  const [factory, setFactory] = useState(null);

  async function connectWallet() {
    if (!window.ethereum) {
      alert("⚠️ Installa MetaMask per continuare");
      return;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    setAccount(accounts[0]);

    const signer = await provider.getSigner();
    const contract = new ethers.Contract(addresses.WalletFactory, factoryAbi.abi, signer);
    setFactory(contract);
  }

  async function createWallet() {
    if (!factory) return alert("Factory non connessa!");
    const tx = await factory.createWallet();
    await tx.wait();
    alert("✅ Nuovo wallet creato!");
    fetchWallets();
  }

  async function fetchWallets() {
    if (!factory || !account) return;
    const list = await factory.getUserWallets(account);
    setWallets(list);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-6">🦊 Chainlink Wallet Factory</h1>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-xl text-lg font-semibold transition"
        >
          Connect MetaMask
        </button>
      ) : (
        <div className="text-center">
          <p className="text-lg mb-2">Connected:</p>
          <p className="font-mono text-green-400">{account}</p>

          <div className="mt-6 space-y-4">
            <button
              onClick={createWallet}
              className="bg-emerald-600 hover:bg-emerald-700 px-5 py-2 rounded-lg"
            >
              ➕ Create New Wallet
            </button>

            <button
              onClick={fetchWallets}
              className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg"
            >
              🔍 View My Wallets
            </button>
          </div>

          {wallets.length > 0 && (
            <div className="mt-6">
              <h2 className="text-xl font-bold mb-2">Your Wallets</h2>
              <ul className="text-sm text-gray-300">
                {wallets.map((w, i) => (
                  <li key={i} className="font-mono">{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;

