const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Inizio test manuale dei trasferimenti...");

  const [owner, receiver] = await ethers.getSigners();

  // Indirizzo della WalletFactory dal deploy
  const factoryAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  const WalletFactory = await ethers.getContractFactory("WalletFactory");
  const factory = await WalletFactory.attach(factoryAddress);

  console.log("👤 Deployer:", owner.address);
  console.log("📬 Factory:", factoryAddress);

  // Crea un nuovo wallet
  const tx = await factory.createWallet();
  const receipt = await tx.wait();

  // Estrai l'evento correttamente da ethers v6
  const event = receipt.logs
    .map((log) => {
      try {
        return factory.interface.parseLog(log);
      } catch (e) {
        return null;
      }
    })
    .find((parsed) => parsed && parsed.name === "WalletCreated");

  if (!event) {
    throw new Error("❌ Evento WalletCreated non trovato!");
  }

  const newWallet = event.args.wallet;
  console.log("✅ Wallet creato:", newWallet);

  // Attacca il contratto SmartWallet
  const SmartWallet = await ethers.getContractFactory("SmartWallet");
  const wallet = await SmartWallet.attach(newWallet);

  // Invia 2 ETH al wallet
  console.log("\n💰 Inviando 2 ETH al wallet...");
  await owner.sendTransaction({
    to: newWallet,
    value: ethers.parseEther("2.0"),
  });

  const balanceBefore = await ethers.provider.getBalance(newWallet);
  console.log("Saldo iniziale wallet:", ethers.formatEther(balanceBefore), "ETH");

  // Trasferisci 0.5 ETH al receiver
  console.log("\n💸 Trasferendo 0.5 ETH a:", receiver.address);
  await wallet.connect(owner).sendETH(receiver.address, ethers.parseEther("0.5"));

  const balanceAfter = await ethers.provider.getBalance(newWallet);
  const receiverBalance = await ethers.provider.getBalance(receiver.address);

  console.log("Saldo wallet dopo:", ethers.formatEther(balanceAfter), "ETH");
  console.log("Saldo destinatario:", ethers.formatEther(receiverBalance), "ETH");

  console.log("\n✅ Test completato con successo!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

