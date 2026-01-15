const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { ethers } = hre;

const FEEDS = {
  sepolia: {
    ETH_USD: "0x694AA1769357215DE4FAC081bf1f309aDC325306", // Chainlink ETH/USD Sepolia
  },
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const networkName = hre.network.name;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  console.log("Network:", networkName, "chainId:", chainId);
  console.log("Deployer:", deployer.address);

  // ------------------------
  // 1) MockToken (solo per test locali; su Sepolia lo deployiamo comunque se ti serve)
  // ------------------------
  const Token = await ethers.getContractFactory("MockToken");
  const mockToken = await Token.deploy(ethers.parseEther("1000000"));
  await mockToken.waitForDeployment();
  console.log("MockToken:", mockToken.target);

  // ------------------------
  // 2) Feed ETH/USD: mock su hardhat, vero su Sepolia
  // ------------------------
  let ethUsdFeedAddress;

  if (networkName === "sepolia") {
    ethUsdFeedAddress = FEEDS.sepolia.ETH_USD;
    console.log("Using Chainlink ETH/USD feed:", ethUsdFeedAddress);
  } else {
    const DECIMALS = 8;
    const INITIAL_PRICE = 3500 * 10 ** DECIMALS;
    const MockAggregator = await ethers.getContractFactory("MockV3Aggregator");
    const mockAggregator = await MockAggregator.deploy(DECIMALS, INITIAL_PRICE);
    await mockAggregator.waitForDeployment();
    console.log("MockV3Aggregator:", mockAggregator.target);
    ethUsdFeedAddress = mockAggregator.target;
  }

  // ------------------------
  // 3) PriceConsumerV3 (facoltativo: utile se lo usi nel frontend)
  // Su Sepolia lo puntiamo al feed vero.
  // ------------------------
  const PriceConsumer = await ethers.getContractFactory("PriceConsumerV3");
  const priceConsumer = await PriceConsumer.deploy();
  await priceConsumer.waitForDeployment();
  console.log("PriceConsumerV3:", priceConsumer.target);

  const txSetFeed = await priceConsumer.setPriceFeed(ethUsdFeedAddress);
  await txSetFeed.wait();

  // ------------------------
  // 4) OraclePrice
  // IMPORTANTE: il tuo OraclePrice.sol attuale è basato sul mock.
  // Quindi lo deployiamo SOLO in locale, non su Sepolia.
  // ------------------------
  let oracleAddress = null;
  if (networkName !== "sepolia") {
    const Oracle = await ethers.getContractFactory("OraclePrice");
    const oracle = await Oracle.deploy(ethUsdFeedAddress);
    await oracle.waitForDeployment();
    oracleAddress = oracle.target;
    console.log("OraclePrice:", oracleAddress);
  } else {
    console.log("Skipping OraclePrice on Sepolia (mock-based contract).");
  }

  // ------------------------
  // 5) USDCMock
  // Su Sepolia rimane un token mock tuo (ok per demo).
  // ------------------------
  const USDCMock = await ethers.getContractFactory("USDCMock");
  const usdcMock = await USDCMock.deploy();
  await usdcMock.waitForDeployment();
  console.log("USDCMock:", usdcMock.target);

  // ------------------------
  // 6) EthUsdcSwap (USDCMock + Feed)
  // ------------------------
  const EthUsdcSwap = await ethers.getContractFactory("EthUsdcSwap");
  const ethUsdcSwap = await EthUsdcSwap.deploy(usdcMock.target, ethUsdFeedAddress);
  await ethUsdcSwap.waitForDeployment();
  console.log("EthUsdcSwap:", ethUsdcSwap.target);

  // ------------------------
  // 7) WalletFactory
  // ------------------------
  const Factory = await ethers.getContractFactory("WalletFactory");
  const walletFactory = await Factory.deploy(ethUsdcSwap.target, usdcMock.target);
  await walletFactory.waitForDeployment();
  console.log("WalletFactory:", walletFactory.target);

  // ------------------------
  // 8) Seed liquidità swap
  // Su Sepolia NON mandiamo 100 ETH: riduciamo.
  // ------------------------
  const usdcLiquidity = ethers.parseUnits("1000000", 6); // 1,000,000 USDC
  const txMint = await usdcMock.mint(ethUsdcSwap.target, usdcLiquidity);
  await txMint.wait();
  console.log("USDC liquidity minted to EthUsdcSwap");

  const ethLiquidity = networkName === "sepolia" ? "0.01" : "100";
  const txEth = await deployer.sendTransaction({
    to: ethUsdcSwap.target,
    value: ethers.parseEther(ethLiquidity),
  });
  await txEth.wait();
  console.log(`ETH liquidity sent to EthUsdcSwap: ${ethLiquidity} ETH`);

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
    "SmartWallet",
    "MockToken",
    "PriceConsumerV3",
    "USDCMock",
    "EthUsdcSwap",
  ];

  // In locale copiamo anche i mock
  if (networkName !== "sepolia") {
    contracts.push("MockV3Aggregator", "OraclePrice");
  }

  for (const name of contracts) {
    const filePath = path.join(backendAbiPath, `${name}.sol/${name}.json`);
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, path.join(frontendAbiPath, `${name}.json`));
    } else {
      console.warn(`ABI not found for ${name} at ${filePath}`);
    }
  }

  // ------------------------
  // 10) Salva addresses per chainId (fondamentale per multi-chain)
  // ------------------------
  const addresses = {
    chainId,
    EthUsdFeed: ethUsdFeedAddress,
    WalletFactory: walletFactory.target,
    SmartWallet: "deployed-per-wallet",
    MockToken: mockToken.target,
    PriceConsumerV3: priceConsumer.target,
    OraclePrice: oracleAddress, // null su Sepolia
    USDCMock: usdcMock.target,
    EthUsdcSwap: ethUsdcSwap.target,
  };

  const outPath = path.join(frontendAbiPath, `addresses.${chainId}.json`);
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("Addresses written to:", outPath);

  // Per retro-compatibilità: aggiorna anche addresses.json con l’ultima rete deployata
  fs.writeFileSync(
    path.join(frontendAbiPath, "addresses.json"),
    JSON.stringify(addresses, null, 2)
  );
  console.log("Also updated frontend/src/abi/addresses.json");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

