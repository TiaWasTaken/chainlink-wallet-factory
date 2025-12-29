// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAccount } from "wagmi";

import Login from "./pages/Login";
import Home from "./pages/Home";

export default function App() {
  const { address, isConnected } = useAccount();

  const account = isConnected ? address : null;
  const setAccount = () => {}; // compatibilità temporanea

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login account={account} setAccount={setAccount} />} />

        <Route
          path="/home"
          element={
            account ? (
              <Home account={account} setAccount={setAccount} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

