const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

/** Salva ABI e indirizzi per il frontend (stile tuo progetto Auction) */
function saveFrontendFiles(deployments) {
  const outDir = path.join(__dirname, "../../frontend/src/abi");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  // Salva addresses.json
  const addresses = {};
  for (const d of deployments) {
    addresses[d.name] = d.address;
  }
  fs.writeFileSync(path.join(outDir, "addresses.json"), JSON.stringify(addresses, null, 2));

  // Salva ABI di ciascun contratto
  for (const d of deployments) {
    const artifact = hre.artifacts.readArtifactSync(d.name);
    fs.writeFileSync(
      path.join(outDir, `${d.name}.json`),
      JSON.stringify(artifact, null, 2)
    );
  }

  console.log("✔ ABI & addresses salvati in frontend/src/abi");
}

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // 1) PriceConsumerV3
  const Price = await hre.ethers.getContractFactory("PriceConsumerV3");
  const price = await Price.deploy();
  await price.waitForDeployment();
  const priceAddr = await price.getAddress();
  console.log("PriceConsumerV3:", priceAddr);

  // 2) WalletFactory
  const Factory = await hre.ethers.getContractFactory("WalletFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  const factoryAddr = await factory.getAddress();
  console.log("WalletFactory:", factoryAddr);

  // (SmartWallet è usato via factory, quindi niente deploy diretto)
  saveFrontendFiles([
    { name: "PriceConsumerV3", address: priceAddr },
    { name: "WalletFactory",   address: factoryAddr },
  ]);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });

