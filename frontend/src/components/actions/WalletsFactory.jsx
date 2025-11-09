// src/components/actions/WalletsFactory.jsx
import React, { useState } from "react";
import WalletList from "./WalletList";

export default function WalletsFactory({ account }) {
  const [activeWallet, setActiveWallet] = useState(null);

  return (
    <div className="flex flex-col items-center w-full mt-10">
      <WalletList account={account} setActiveWallet={setActiveWallet} />
      {activeWallet && (
        <p className="mt-6 text-sm text-emerald-400 font-semibold">
          Active wallet: {activeWallet}
        </p>
      )}
    </div>
  );
}

