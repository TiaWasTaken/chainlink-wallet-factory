// src/components/actions/WalletsFactory.jsx
import React, { useState } from "react";
import WalletList from "./WalletList";

export default function WalletsFactory({ account }) {
  const [activeWallet, setActiveWallet] = useState(null);

  return (
    <div className="flex flex-col items-center w-full mt-10">
      <WalletList currentAccount={account} setActiveWallet={setActiveWallet} />

      {activeWallet && (
        <p className="mt-6 text-sm text-emerald-300 font-semibold">
          Active wallet:{" "}
          <span className="font-mono text-emerald-200">
            {activeWallet.slice(0, 10)}…{activeWallet.slice(-8)}
          </span>
        </p>
      )}
    </div>
  );
}

