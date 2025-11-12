const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  //Deploy MockToken
  const Token = await ethers.getContractFactory("MockToken");
  const mockToken = await Token.deploy(ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockToken:", await mockToken.getAddress());

  //Deploy PriceConsumerV3
  const PriceConsumer = await ethers.getContractFactory("PriceConsumerV3");
  const priceConsumer = await PriceConsumer.deploy();
  await priceConsumer.waitForDeployment();
  console.log("PriceConsumerV3:", await priceConsumer.getAddress());

  // Deploy WalletFactory
  const Factory = await ethers.getContractFactory("WalletFactory");
  const walletFactory = await Factory.deploy();
  await walletFactory.waitForDeployment();
  console.log("WalletFactory:", await walletFactory.getAddress());

  // Salva ABI e indirizzi nel frontend
  const backendAbiPath = path.join(__dirname, "../artifacts/contracts");
  const frontendAbiPath = path.join(__dirname, "../../frontend/src/abi");
  if (!fs.existsSync(frontendAbiPath)) fs.mkdirSync(frontendAbiPath, { recursive: true });

  // Copia i file ABI principali
  const contracts = ["WalletFactory", "MockToken", "PriceConsumerV3"];
  for (const name of contracts) {
    const filePath = path.join(backendAbiPath, `${name}.sol/${name}.json`);
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, path.join(frontendAbiPath, `${name}.json`));
    }
  }

  // Crea il file degli indirizzi
  const addresses = {
    WalletFactory: await walletFactory.getAddress(),
    MockToken: await mockToken.getAddress(),
    PriceConsumerV3: await priceConsumer.getAddress(),
  };

  fs.writeFileSync(
    path.join(frontendAbiPath, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("ABI & addresses copied in frontend/src/abi/");
  console.log("Deploy complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

