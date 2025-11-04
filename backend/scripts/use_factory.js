require("dotenv").config();
const hre = require("hardhat");
const path = require("path");
const fs = require("fs");

async function main() {
  const addrsPath = path.join(__dirname, "../../frontend/src/abi/addresses.json");
  const addresses = JSON.parse(fs.readFileSync(addrsPath, "utf-8"));
  const factoryAddr = addresses.WalletFactory;
  if (!factoryAddr) throw new Error("WalletFactory address non trovato in addresses.json");

  const [user] = await hre.ethers.getSigners();
  const Factory = await hre.ethers.getContractFactory("WalletFactory");
  const factory = Factory.attach(factoryAddr);

  console.log("User:", user.address);
  // createWallet()
  const tx = await factory.connect(user).createWallet();
  const rc = await tx.wait();
  console.log("createWallet tx:", rc.hash);

  // getWallets(user)
  const wallets = await factory.getWallets(user.address);
  console.log("Wallets dell'utente:", wallets);
}

main().catch((e)=>{ console.error(e); process.exitCode = 1; });

