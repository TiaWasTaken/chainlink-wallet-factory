// src/App.jsx
import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Home from "./pages/Home";

export default function App() {
  const [account, setAccount] = useState(null);

  useEffect(() => {
    if (!window.ethereum) return;

    // Aggiorna account quando cambia in MetaMask
    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        console.log("✅ Account switched:", accounts[0]);
        setAccount(accounts[0]);
      } else {
        console.log("⚠️ No account found, disconnecting...");
        setAccount(null);
      }
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    return () => window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login account={account} setAccount={setAccount} />} />
        <Route path="/home" element={<Home account={account} setAccount={setAccount} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

