const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Avvio deploy completo...");

  const [deployer] = await ethers.getSigners();
  console.log("👤 Deployer:", deployer.address);

  // === Deploy MockToken ===
  const MockToken = await ethers.getContractFactory("MockToken");
  const token = await MockToken.deploy(ethers.parseEther("1000000")); // 1 milione MCK
  await token.waitForDeployment();
  console.log("🪙 MockToken:", await token.getAddress());

  // === Deploy PriceConsumerV3 ===
  const PriceConsumer = await ethers.getContractFactory("PriceConsumerV3");
  const consumer = await PriceConsumer.deploy();
  await consumer.waitForDeployment();
  console.log("📈 PriceConsumerV3:", await consumer.getAddress());

  // === Deploy WalletFactory ===
  const Factory = await ethers.getContractFactory("WalletFactory");
  const factory = await Factory.deploy(); // ✅ nessun parametro
  await factory.waitForDeployment();
  console.log("🏭 WalletFactory:", await factory.getAddress());

  // === Salva ABI + indirizzi nel frontend ===
  const frontendDir = path.join(__dirname, "../frontend/src/abi");
  if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });

  const addresses = {
    MockToken: await token.getAddress(),
    PriceConsumerV3: await consumer.getAddress(),
    WalletFactory: await factory.getAddress(),
  };
  fs.writeFileSync(`${frontendDir}/contract-address.json`, JSON.stringify(addresses, null, 2));

  const artifactNames = ["MockToken", "PriceConsumerV3", "WalletFactory"];
  for (const name of artifactNames) {
    const artifact = require(`../artifacts/contracts/${name}.sol/${name}.json`);
    fs.writeFileSync(`${frontendDir}/${name}.json`, JSON.stringify(artifact, null, 2));
  }

  console.log("✅ ABI & indirizzi salvati in:", frontendDir);
  console.log("🎉 Deploy completato!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

