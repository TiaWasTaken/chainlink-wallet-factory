const { ethers } = require("hardhat");

async function main() {

  // Recupera 3 account di test Hardhat
  const [deployer, user, recipient] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User: ${user.address}`);
  console.log(`Recipient: ${recipient.address}\n`);

  // Deploy del token di test (MockToken)
  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy(ethers.parseUnits("1000000", 18)); // 1 milione MCK
  await mockToken.waitForDeployment();
  console.log(`🪙 MockToken deployato: ${await mockToken.getAddress()}`);

  // Deploy della WalletFactory
  const WalletFactory = await ethers.getContractFactory("WalletFactory");
  const factory = await WalletFactory.deploy();
  await factory.waitForDeployment();
  console.log(`🏭 WalletFactory deployata: ${await factory.getAddress()}\n`);

  // Crea un wallet per l’utente
  const tx = await factory.connect(user).createWallet();
  await tx.wait();
  const wallets = await factory.getWallets(user.address);
  const walletAddr = wallets[0];
  console.log(`💼 Wallet creato per ${user.address}: ${walletAddr}`);

  // Collega contratto SmartWallet all’indirizzo creato
  const SmartWallet = await ethers.getContractFactory("SmartWallet");
  const wallet = SmartWallet.attach(walletAddr);

  // Invia 2 ETH al wallet per simulare fondi iniziali
  const sendTx = await deployer.sendTransaction({
    to: walletAddr,
    value: ethers.parseEther("2"),
  });
  await sendTx.wait();
  const walletBalance = await ethers.provider.getBalance(walletAddr);
  console.log(`Saldo wallet: ${ethers.formatEther(walletBalance)} ETH\n`);

  // Invia token all’utente e al wallet per simulare liquidità
  await mockToken.transfer(user.address, ethers.parseUnits("10000", 18));

  await mockToken.transfer(walletAddr, ethers.parseUnits("5000", 18));

  // Approva il wallet a spendere token dell’utente
  await mockToken.connect(user).approve(walletAddr, ethers.parseUnits("10000", 18));

  // Esegui lo swap ETH → Token (simulato)
  const ethSwapAmount = ethers.parseEther("0.5");
  const swapEthTx = await wallet.connect(user).swapETHForTokens(
    await mockToken.getAddress(),
    ethSwapAmount
  );
  await swapEthTx.wait();
  console.log(`Swap ETH→MCK completato (0.5 ETH → 500 MCK)`);

  // Esegui lo swap Token → ETH (simulato)
  const tokenSwapAmount = ethers.parseUnits("1000", 18);
  const swapTokenTx = await wallet.connect(user).swapTokensForETH(
    await mockToken.getAddress(),
    tokenSwapAmount
  );
  await swapTokenTx.wait();
  console.log("Swap MCK→ETH completato (1000 MCK → 1 ETH)\n");

  // Mostra saldi finali
  const finalEth = await ethers.provider.getBalance(walletAddr);
  const finalMCK = await mockToken.balanceOf(walletAddr);

  console.log(`Wallet ETH: ${ethers.formatEther(finalEth)} ETH`);
  console.log(`Wallet MCK: ${ethers.formatUnits(finalMCK, 18)} MCK\n`);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

