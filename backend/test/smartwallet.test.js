const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SmartWallet", function () {
  let owner, other, SmartWallet, wallet;

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    SmartWallet = await ethers.getContractFactory("SmartWallet");
    wallet = await SmartWallet.deploy(owner.address); // <-- passiamo l’owner
    await wallet.waitForDeployment();
  });

  it("deve impostare correttamente l'owner al deploy", async () => {
    expect(await wallet.owner()).to.equal(owner.address);
  });

  it("deve ricevere ETH e aggiornare il saldo", async () => {
    await owner.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther("1") });
    const bal = await ethers.provider.getBalance(await wallet.getAddress());
    expect(bal).to.equal(ethers.parseEther("1"));
  });

  it("deve permettere solo all'owner di inviare ETH", async () => {
    await owner.sendTransaction({ to: await wallet.getAddress(), value: ethers.parseEther("1") });
    await expect(wallet.connect(owner).sendETH(other.address, ethers.parseEther("0.4")))
      .to.emit(wallet, "Sent").withArgs(other.address, ethers.parseEther("0.4"));
  });

  it("deve revert se un non-owner prova a inviare ETH", async () => {
    await expect(wallet.connect(other).sendETH(owner.address, 1)).to.be.revertedWithCustomError(
      wallet,
      "OwnableUnauthorizedAccount"
    );
  });
});

