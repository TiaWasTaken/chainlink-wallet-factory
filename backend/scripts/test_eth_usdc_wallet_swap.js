const { ethers } = require("hardhat");
const path = require("path");
const fs = require("fs");

function fmtEth(x) {
  return ethers.formatEther(x);
}

function fmtUsdc(x) {
  return ethers.formatUnits(x, 6);
}

async function readAddresses() {
  const addrsPath = path.join(__dirname, "../../frontend/src/abi/addresses.json");
  if (!fs.existsSync(addrsPath)) {
    throw new Error(`addresses.json non trovato: ${addrsPath}\nEsegui prima deploy_all.js`);
  }
  return JSON.parse(fs.readFileSync(addrsPath, "utf-8"));
}

async function main() {
  const [owner] = await ethers.getSigners();

  const addresses = await readAddresses();

  const factoryAddress = addresses.WalletFactory;
  const usdcAddress = addresses.USDCMock;
  const swapAddress = addresses.EthUsdcSwap;

  if (!factoryAddress || !usdcAddress || !swapAddress) {
    throw new Error("addresses.json incompleto: servono WalletFactory, USDCMock, EthUsdcSwap");
  }

  console.log("Owner (EOA):", owner.address);
  console.log("WalletFactory:", factoryAddress);
  console.log("USDCMock:", usdcAddress);
  console.log("EthUsdcSwap:", swapAddress);

  // Attach contracts
  const WalletFactory = await ethers.getContractFactory("WalletFactory");
  const factory = WalletFactory.attach(factoryAddress);

  const USDCMock = await ethers.getContractFactory("USDCMock");
  const usdc = USDCMock.attach(usdcAddress);

  const swap = await ethers.getContractAt("EthUsdcSwap", swapAddress);

  // -----------------------
  // [1] Create wallet
  // -----------------------
  console.log("\n[1] Creazione side wallet...");
  const tx = await factory.connect(owner).createWallet();
  const receipt = await tx.wait();

  const parsed = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((x) => x && x.name === "WalletCreated");

  if (!parsed) throw new Error("Evento WalletCreated non trovato");

  const walletAddress = parsed.args.wallet;
  console.log("Side wallet creato:", walletAddress);

  const SmartWallet = await ethers.getContractFactory("SmartWallet");
  const wallet = SmartWallet.attach(walletAddress);

  // -----------------------
  // [2] Fund wallet with ETH
  // -----------------------
  console.log("\n[2] Invio 2 ETH al side wallet...");
  await (
    await owner.sendTransaction({
      to: walletAddress,
      value: ethers.parseEther("2.0"),
    })
  ).wait();

  // Snapshot iniziali
  const eoaEth0 = await ethers.provider.getBalance(owner.address);
  const walletEth0 = await ethers.provider.getBalance(walletAddress);
  const walletUsdc0 = await usdc.balanceOf(walletAddress);

  console.log("EOA ETH (inizio):", fmtEth(eoaEth0));
  console.log("Wallet ETH (inizio):", fmtEth(walletEth0));
  console.log("Wallet USDC (inizio):", fmtUsdc(walletUsdc0));

  // -----------------------
  // [3] Swap ETH -> USDC (dal WALLET)
  // -----------------------
  console.log("\n[3] Swap ETH -> USDC (chiamata al wallet, paga il wallet)...");
  const ethIn = ethers.parseEther("0.5");

  // quote e minOut (1% slippage)
  const quotedUsdc = await swap.quoteBuyUsdc(ethIn);
  const minUsdcOut = (quotedUsdc * 99n) / 100n;

  console.log("Quote USDC (per 0.5 ETH):", fmtUsdc(quotedUsdc));
  console.log("minUsdcOut (1% slippage):", fmtUsdc(minUsdcOut));

  const txSwap1 = await wallet.connect(owner).swapEthToUsdc(ethIn, minUsdcOut);
  const rc1 = await txSwap1.wait();

  const eoaEth1 = await ethers.provider.getBalance(owner.address);
  const walletEth1 = await ethers.provider.getBalance(walletAddress);
  const walletUsdc1 = await usdc.balanceOf(walletAddress);

  console.log("Tx swap ETH->USDC:", rc1.hash);
  console.log("EOA ETH (dopo swap1):", fmtEth(eoaEth1), "(deve cambiare solo per gas)");
  console.log("Wallet ETH (dopo swap1):", fmtEth(walletEth1), "(deve scendere di ~0.5 ETH)");
  console.log("Wallet USDC (dopo swap1):", fmtUsdc(walletUsdc1), "(deve salire)");

  // -----------------------
  // [4] Swap USDC -> ETH (dal WALLET)
  // -----------------------
  console.log("\n[4] Swap USDC -> ETH (chiamata al wallet, vende USDC del wallet)...");
  const usdcIn = (walletUsdc1 * 50n) / 100n; // 50%

  // quote e minOut (1% slippage)
  const quotedEth = await swap.quoteSellUsdc(usdcIn);
  const minEthOut = (quotedEth * 99n) / 100n;

  console.log("USDC da vendere:", fmtUsdc(usdcIn));
  console.log("Quote ETH (per USDC venduti):", fmtEth(quotedEth));
  console.log("minEthOut (1% slippage):", fmtEth(minEthOut));

  const txSwap2 = await wallet.connect(owner).swapUsdcToEth(usdcIn, minEthOut);
  const rc2 = await txSwap2.wait();

  const eoaEth2 = await ethers.provider.getBalance(owner.address);
  const walletEth2 = await ethers.provider.getBalance(walletAddress);
  const walletUsdc2 = await usdc.balanceOf(walletAddress);

  console.log("Tx swap USDC->ETH:", rc2.hash);
  console.log("EOA ETH (dopo swap2):", fmtEth(eoaEth2), "(deve cambiare solo per gas)");
  console.log("Wallet ETH (dopo swap2):", fmtEth(walletEth2), "(deve risalire)");
  console.log("Wallet USDC (dopo swap2):", fmtUsdc(walletUsdc2), "(deve scendere)");

  // -----------------------
  // [5] Sanity checks (fail fast)
  // -----------------------
  console.log("\n[5] Sanity checks...");

  if (walletEth1 >= walletEth0) {
    throw new Error("❌ Wallet ETH non è sceso dopo ETH->USDC: qualcosa non torna");
  }
  if (walletUsdc1 <= walletUsdc0) {
    throw new Error("❌ Wallet USDC non è salito dopo ETH->USDC: qualcosa non torna");
  }
  if (walletEth2 <= walletEth1) {
    throw new Error("❌ Wallet ETH non è risalito dopo USDC->ETH: qualcosa non torna");
  }
  if (walletUsdc2 >= walletUsdc1) {
    throw new Error("❌ Wallet USDC non è sceso dopo USDC->ETH: qualcosa non torna");
  }

  console.log("✅ Sanity checks OK");

  console.log("\nDone.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

