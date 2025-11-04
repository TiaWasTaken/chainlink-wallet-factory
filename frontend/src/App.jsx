import { useState } from "react";
import { ethers } from "ethers";
import factoryAbi from "./abi/WalletFactory.json";
import tokenAbi from "./abi/MockToken.json";
import addresses from "./abi/addresses.json";

function App() {
  const [account, setAccount] = useState(null);
  const [factory, setFactory] = useState(null);
  const [token, setToken] = useState(null);
  const [wallets, setWallets] = useState([]);

  // 🔗 Connessione a MetaMask
  async function connectWallet() {
    if (!window.ethereum) return alert("⚠️ Installa MetaMask per continuare");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();

    const f = new ethers.Contract(addresses.WalletFactory, factoryAbi.abi, signer);
    const t = new ethers.Contract(addresses.MockToken, tokenAbi.abi, signer);

    setAccount(accounts[0]);
    setFactory(f);
    setToken(t);

    console.log("✅ Connected:", accounts[0]);
  }

  // 🏗️ Crea un nuovo wallet
  async function createWallet() {
    if (!factory) return alert("Factory non connessa!");
    const tx = await factory.createWallet();
    await tx.wait();
    alert("✅ Nuovo wallet creato!");
  }

  // 🔍 Legge i wallet dell'utente
  async function viewWallets() {
    if (!factory || !account) return;
    const res = await factory.getUserWallets(account);
    console.log("💼 Wallets trovati:", res);
    setWallets(res);
  }

  // 💸 Invia 1 ETH al primo wallet
  async function sendETH() {
    if (!wallets[0]) return alert("Nessun wallet disponibile!");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const tx = await signer.sendTransaction({
      to: wallets[0],
      value: ethers.parseEther("1"),
    });
    await tx.wait();
    alert("✅ 1 ETH inviato al primo wallet");
  }

  // 🪙 Trasferisci 1000 MCK all’account connesso
  async function mintMCK() {
    if (!token || !account) return alert("Token non connesso!");
    const tx = await token.transfer(account, ethers.parseUnits("1000", 18));
    await tx.wait();
    alert("✅ 1000 MCK inviati al tuo account");
  }

  // 🔄 Swap ETH → MCK (0.5 ETH)
  async function swapETHforMCK() {
    if (!wallets[0]) return alert("Crea prima un wallet!");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // ⚠️ Qui dovresti sostituire con l’ABI corretta di SmartWallet
    // per ora assumiamo che abbia swapETHForTokens()
    const wallet = new ethers.Contract(wallets[0], factoryAbi.abi, signer);
    const tx = await wallet.swapETHForTokens({
      value: ethers.parseEther("0.5"),
    });
    await tx.wait();
    alert("✅ Swap 0.5 ETH → MCK completato!");
  }

  // 🔁 Swap MCK → ETH (100 MCK)
  async function swapMCKforETH() {
    if (!wallets[0]) return alert("Crea prima un wallet!");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const wallet = new ethers.Contract(wallets[0], factoryAbi.abi, signer);
    const tx = await wallet.swapTokensForETH(ethers.parseUnits("100", 18));
    await tx.wait();
    alert("✅ Swap 100 MCK → ETH completato!");
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center space-y-4">
      <h1 className="text-3xl font-bold">🧩 Backend Function Tester</h1>

      {!account ? (
        <button
          onClick={connectWallet}
          className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg"
        >
          🔗 Connect MetaMask
        </button>
      ) : (
        <>
          <p className="text-green-400">Connected: {account}</p>

          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button onClick={createWallet} className="bg-emerald-600 px-4 py-2 rounded-lg">
              ➕ Create Wallet
            </button>
            <button onClick={viewWallets} className="bg-indigo-600 px-4 py-2 rounded-lg">
              🔍 View Wallets
            </button>
            <button onClick={sendETH} className="bg-yellow-600 px-4 py-2 rounded-lg">
              💸 Send ETH
            </button>
            <button onClick={mintMCK} className="bg-orange-600 px-4 py-2 rounded-lg">
              🪙 Mint 1000 MCK
            </button>
            <button onClick={swapETHforMCK} className="bg-teal-600 px-4 py-2 rounded-lg">
              🔄 Swap ETH→MCK
            </button>
            <button onClick={swapMCKforETH} className="bg-pink-600 px-4 py-2 rounded-lg">
              🔁 Swap MCK→ETH
            </button>
          </div>

          {wallets.length > 0 && (
            <div className="mt-6 text-center">
              <h2 className="text-xl font-bold mb-2">Your Wallets</h2>
              {wallets.map((w, i) => (
                <p key={i} className="font-mono text-gray-300">{w}</p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;

