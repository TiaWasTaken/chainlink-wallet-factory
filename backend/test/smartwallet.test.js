// =====================================
// ✅ Test per SmartWallet.sol
// =====================================

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartWallet", function () {
  let SmartWallet, wallet, owner, other;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();

    SmartWallet = await ethers.getContractFactory("SmartWallet");
    wallet = await SmartWallet.deploy(owner.address);
    await wallet.waitForDeployment();
  });

  // ✅ Test 1 - L'owner è corretto
  it("deve impostare correttamente l'owner al deploy", async () => {
    const walletOwner = await wallet.owner();
    expect(walletOwner).to.equal(owner.address);
  });

  // ✅ Test 2 - Ricezione ETH
  it("deve ricevere ETH e aggiornare il saldo", async () => {
    const tx = await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("1.0"),
    });
    await tx.wait();

    const balance = await ethers.provider.getBalance(await wallet.getAddress());
    expect(balance).to.equal(ethers.parseEther("1.0"));
  });

  // ✅ Test 3 - Solo l'owner può inviare ETH
  it("deve permettere solo all'owner di inviare ETH", async () => {
    // Deposito iniziale
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("1"),
    });

    // Invio 0.5 ETH da owner → other
    await expect(wallet.connect(owner).sendETH(other.address, ethers.parseEther("0.5")))
      .to.changeEtherBalances(
        [wallet, other],
        [ethers.parseEther("-0.5"), ethers.parseEther("0.5")]
      );
  });

  // ✅ Test 4 - Non-owner deve fallire
  it("deve revert se un non-owner prova a inviare ETH", async () => {
    await owner.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("1"),
    });

    await expect(
      wallet.connect(other).sendETH(owner.address, ethers.parseEther("0.1"))
    ).to.be.revertedWith("Not authorized");
  });
});

