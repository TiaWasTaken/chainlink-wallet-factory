const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Token = await ethers.getContractFactory("MockToken");
  const mockToken = await Token.deploy(ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockToken:", mockToken.target);

  const DECIMALS = 8;
  const INITIAL_PRICE = 3500 * 10 ** DECIMALS;

  const MockAggregator = await ethers.getContractFactory("MockV3Aggregator");
  const mockAggregator = await MockAggregator.deploy(DECIMALS, INITIAL_PRICE);
  await mockAggregator.waitForDeployment();
  console.log("MockV3Aggregator:", mockAggregator.target);

  const PriceConsumer = await ethers.getContractFactory("PriceConsumerV3");
  const priceConsumer = await PriceConsumer.deploy();
  await priceConsumer.waitForDeployment();
  console.log("PriceConsumerV3:", priceConsumer.target);

  const tx = await priceConsumer.setPriceFeed(mockAggregator.target);
  await tx.wait();

  const Oracle = await ethers.getContractFactory("OraclePrice");
  const oracle = await Oracle.deploy(mockAggregator.target);
  await oracle.waitForDeployment();
  console.log("OraclePrice:", oracle.target);

  const Factory = await ethers.getContractFactory("WalletFactory");
  const walletFactory = await Factory.deploy();
  await walletFactory.waitForDeployment();
  console.log("WalletFactory:", walletFactory.target);

  const backendAbiPath = path.join(__dirname, "../artifacts/contracts");
  const frontendAbiPath = path.join(__dirname, "../../frontend/src/abi");

  if (!fs.existsSync(frontendAbiPath)) {
    fs.mkdirSync(frontendAbiPath, { recursive: true });
  }

  const contracts = [
    "WalletFactory",
    "MockToken",
    "PriceConsumerV3",
    "MockV3Aggregator",
    "OraclePrice"
  ];

  for (const name of contracts) {
    const filePath = path.join(backendAbiPath, `${name}.sol/${name}.json`);
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, path.join(frontendAbiPath, `${name}.json`));
    }
  }

  const addresses = {
    WalletFactory: walletFactory.target,
    MockToken: mockToken.target,
    PriceConsumerV3: priceConsumer.target,
    MockV3Aggregator: mockAggregator.target,
    OraclePrice: oracle.target
  };

  fs.writeFileSync(
    path.join(frontendAbiPath, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );

  console.log("Addresses written to frontend/src/abi/");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

