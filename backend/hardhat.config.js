require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {},

    // consigliato: network esplicito per npx hardhat node (127.0.0.1:8545)
    localhost: {
      url: "http://127.0.0.1:8545",
    },

    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

