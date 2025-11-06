import { useState, useEffect } from "react";

export default function Home() {
  const [account, setAccount] = useState(null);

  // ✅ Recupera account da MetaMask se già connesso
  useEffect(() => {
    async function loadAccount() {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          } else {
            // se non c'è connessione → torna al login
            window.location.href = "/login";
          }
        } catch (e) {
          console.error(e);
          window.location.href = "/login";
        }
      } else {
        window.location.href = "/login";
      }
    }

    loadAccount();
  }, []);

  // 🧭 Logout
  function disconnectWallet() {
    setAccount(null);
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 flex flex-col items-center text-gray-800 relative overflow-hidden">
      {/* Navbar */}
      <nav className="w-full flex justify-between items-center px-8 py-4 border-b border-gray-300 bg-white/60 backdrop-blur-md shadow-sm fixed top-0 left-0 z-20">
        <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Ethereum Dashboard
        </h1>
        <div className="flex items-center gap-4">
          {account && (
            <span className="text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-lg border border-gray-200">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          )}
          <button
            onClick={disconnectWallet}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-lg shadow-sm hover:scale-105 transition-transform duration-200"
          >
            Disconnect
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center flex-1 mt-24 px-4 text-center">
        <h2 className="text-4xl font-extrabold mb-4">Welcome back 👋</h2>
        <p className="text-gray-600 mb-8">
          You’re connected with your MetaMask wallet.
        </p>
        <div className="w-[300px] h-[300px] rounded-2xl bg-gradient-to-br from-purple-400/10 to-indigo-400/10 flex items-center justify-center border border-purple-300/20">
          <span className="text-purple-700 font-semibold">
            Smart Contract Area (coming soon)
          </span>
        </div>
      </main>
    </div>
  );
}

