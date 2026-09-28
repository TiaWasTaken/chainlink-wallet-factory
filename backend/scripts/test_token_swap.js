const { ethers } = require("hardhat");

async function main() {


  const [deployer, user, recipient] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`User: ${user.address}`);
  console.log(`Recipient: ${recipient.address}\n`);


  const MockToken = await ethers.getContractFactory("MockToken");
  const mockToken = await MockToken.deploy(ethers.parseUnits("1000000", 18));
  await mockToken.waitForDeployment();
  console.log(`🪙 MockToken deployato: ${await mockToken.getAddress()}`);


  const WalletFactory = await ethers.getContractFactory("WalletFactory");
  const factory = await WalletFactory.deploy();
  await factory.waitForDeployment();
  console.log(`🏭 WalletFactory deployata: ${await factory.getAddress()}\n`);


  const tx = await factory.connect(user).createWallet();
  await tx.wait();
  const wallets = await factory.getWallets(user.address);
  const walletAddr = wallets[0];
  console.log(`💼 Wallet creato per ${user.address}: ${walletAddr}`);


  const SmartWallet = await ethers.getContractFactory("SmartWallet");
  const wallet = SmartWallet.attach(walletAddr);


  const sendTx = await deployer.sendTransaction({
    to: walletAddr,
    value: ethers.parseEther("2"),
  });
  await sendTx.wait();
  const walletBalance = await ethers.provider.getBalance(walletAddr);
  console.log(`Saldo wallet: ${ethers.formatEther(walletBalance)} ETH\n`);


  await mockToken.transfer(user.address, ethers.parseUnits("10000", 18));

  await mockToken.transfer(walletAddr, ethers.parseUnits("5000", 18));


  await mockToken.connect(user).approve(walletAddr, ethers.parseUnits("10000", 18));


  const ethSwapAmount = ethers.parseEther("0.5");
  const swapEthTx = await wallet.connect(user).swapETHForTokens(
    await mockToken.getAddress(),
    ethSwapAmount
  );
  await swapEthTx.wait();
  console.log(`Swap ETH→MCK completato (0.5 ETH → 500 MCK)`);


  const tokenSwapAmount = ethers.parseUnits("1000", 18);
  const swapTokenTx = await wallet.connect(user).swapTokensForETH(
    await mockToken.getAddress(),
    tokenSwapAmount
  );
  await swapTokenTx.wait();
  console.log("Swap MCK→ETH completato (1000 MCK → 1 ETH)\n");


  const finalEth = await ethers.provider.getBalance(walletAddr);
  const finalMCK = await mockToken.balanceOf(walletAddr);

  console.log(`Wallet ETH: ${ethers.formatEther(finalEth)} ETH`);
  console.log(`Wallet MCK: ${ethers.formatUnits(finalMCK, 18)} MCK\n`);

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

