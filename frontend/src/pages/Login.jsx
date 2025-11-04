import EthereumLogo from "../canva/EthereumLogo";

export default function Login({ connectWallet }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 text-gray-900">
      <div className="h-64 w-64 mb-10">
        <EthereumLogo />
      </div>

      <h1 className="text-3xl font-bold mb-3 text-gray-800">Connetti il tuo Wallet</h1>
      <p className="text-gray-600 mb-8">Minimal, moderno, viola Ethereum. Entra per continuare.</p>

      <button
        onClick={connectWallet}
        className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-md hover:shadow-purple-300/50 hover:scale-105 transition-transform duration-300"
      >
        🦊 Connetti MetaMask
      </button>

      <p className="text-sm text-gray-500 mt-6 text-center max-w-sm">
        Problemi con MetaMask? Assicurati di avere il nodo locale avviato (Hardhat) e la rete <b>Hardhat Localhost</b>.
      </p>
    </div>
  );
}

