const fs = require("fs");
const path = require("path");
const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // ------------------------
  // 1) MockToken (già esistente)
  // ------------------------
  const Token = await ethers.getContractFactory("MockToken");
  const mockToken = await Token.deploy(ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockToken:", mockToken.target);

  // ------------------------
  // 2) MockV3Aggregator (ETH / USD)
  // ------------------------
  const DECIMALS = 8;
  const INITIAL_PRICE = 3500 * 10 ** DECIMALS;

  const MockAggregator = await ethers.getContractFactory("MockV3Aggregator");
  const mockAggregator = await MockAggregator.deploy(DECIMALS, INITIAL_PRICE);
  await mockAggregator.waitForDeployment();
  console.log("MockV3Aggregator:", mockAggregator.target);

  // ------------------------
  // 3) PriceConsumerV3
  // ------------------------
  const PriceConsumer = await ethers.getContractFactory("PriceConsumerV3");
  const priceConsumer = await PriceConsumer.deploy();
  await priceConsumer.waitForDeployment();
  console.log("PriceConsumerV3:", priceConsumer.target);

  const txSetFeed = await priceConsumer.setPriceFeed(mockAggregator.target);
  await txSetFeed.wait();

  // ------------------------
  // 4) OraclePrice (wrapper tuo)
  // ------------------------
  const Oracle = await ethers.getContractFactory("OraclePrice");
  const oracle = await Oracle.deploy(mockAggregator.target);
  await oracle.waitForDeployment();
  console.log("OraclePrice:", oracle.target);

  // ------------------------
  // 5) WalletFactory
  // ------------------------
  const Factory = await ethers.getContractFactory("WalletFactory");
  const walletFactory = await Factory.deploy();
  await walletFactory.waitForDeployment();
  console.log("WalletFactory:", walletFactory.target);

  // ------------------------
  // 6) USDCMock (nuovo ERC20 6 decimali)
  // ------------------------
  const USDCMock = await ethers.getContractFactory("USDCMock");
  const usdcMock = await USDCMock.deploy();
  await usdcMock.waitForDeployment();
  console.log("USDCMock:", usdcMock.target);

  // ------------------------
  // 7) EthUsdcSwap (nuovo contratto di swap)
  //    usa: USDCMock + MockV3Aggregator (ETH/USD)
  // ------------------------
  const EthUsdcSwap = await ethers.getContractFactory("EthUsdcSwap");
  const ethUsdcSwap = await EthUsdcSwap.deploy(
    usdcMock.target,
    mockAggregator.target
  );
  await ethUsdcSwap.waitForDeployment();
  console.log("EthUsdcSwap:", ethUsdcSwap.target);

  // ------------------------
  // 8) Seed di liquidità per lo swap
  // ------------------------

  // 1,000,000 USDC (6 decimali)
  const usdcLiquidity = ethers.parseUnits("1000000", 6);
  const txUsdc = await usdcMock.transfer(ethUsdcSwap.target, usdcLiquidity);
  await txUsdc.wait();
  console.log("USDC liquidity sent to EthUsdcSwap");

  // 100 ETH di liquidità
  const txEth = await deployer.sendTransaction({
    to: ethUsdcSwap.target,
    value: ethers.parseEther("100")
  });
  await txEth.wait();
  console.log("ETH liquidity sent to EthUsdcSwap");

  // ------------------------
  // 9) Copia ABI al frontend
  // ------------------------
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
    "OraclePrice",
    "USDCMock",      // NEW
    "EthUsdcSwap"    // NEW
  ];

  for (const name of contracts) {
    const filePath = path.join(backendAbiPath, `${name}.sol/${name}.json`);
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(
        filePath,
        path.join(frontendAbiPath, `${name}.json`)
      );
    } else {
      console.warn(`ABI not found for ${name} at ${filePath}`);
    }
  }

  // ------------------------
  // 10) Salva gli indirizzi per il frontend
  // ------------------------
  const addresses = {
    WalletFactory: walletFactory.target,
    MockToken: mockToken.target,
    PriceConsumerV3: priceConsumer.target,
    MockV3Aggregator: mockAggregator.target,
    OraclePrice: oracle.target,
    USDCMock: usdcMock.target,          // NEW
    EthUsdcSwap: ethUsdcSwap.target     // NEW
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

