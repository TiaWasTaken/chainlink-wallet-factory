// scripts/pump_price.js
const { JsonRpcProvider, Contract } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
  const abiPath = path.join(
    __dirname,
    "../artifacts/contracts/MockV3Aggregator.sol/MockV3Aggregator.json"
  );
  const abi = JSON.parse(fs.readFileSync(abiPath, "utf-8")).abi;

  const addressesPath = path.join(
    __dirname,
    "../../frontend/src/abi/addresses.json"
  );
  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf-8"));

  const MOCK_ADDRESS = addresses.MockV3Aggregator;

  if (!MOCK_ADDRESS) {
    throw new Error("MockV3Aggregator address not found in addresses.json");
  }

  const provider = new JsonRpcProvider("http://127.0.0.1:8545");
  const signer = await provider.getSigner(0);
  const mock = new Contract(MOCK_ADDRESS, abi, signer);

  console.log("Updating mock price every 3 seconds...");

  setInterval(async () => {
    try {
      const base = 3500;
      const volatility = Math.floor(Math.random() * 60) - 30;
      const updated = base + volatility;

      const decimals = await mock.decimals();

      const updatedBig = BigInt(updated);
      const multiplier = 10n ** BigInt(decimals);
      const scaled = updatedBig * multiplier;

      const tx = await mock.updateAnswer(scaled);
      await tx.wait();

      console.log("Updated price:", updated);
    } catch (err) {
      console.error("Error updating price:", err);
    }
  }, 3000);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

