
const { expect } = require("chai");
const { ethers } = require("hardhat");

const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("WalletFactory", function () {
  let Factory, factory, user;

  beforeEach(async () => {
    [user] = await ethers.getSigners();
    Factory = await ethers.getContractFactory("WalletFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });


  it("deve creare un nuovo wallet e associarlo all'utente", async function () {
    const tx = await factory.createWallet();
    await tx.wait();

    const wallets = await factory.getWallets(user.address);
    expect(wallets.length).to.equal(1);
    expect(wallets[0]).to.properAddress;
  });


  it("deve emettere l'evento WalletCreated", async function () {
    await expect(factory.createWallet())
      .to.emit(factory, "WalletCreated")
      .withArgs(user.address, anyValue);
  });


  it("deve salvare più wallet per lo stesso utente", async function () {
    await factory.createWallet();
    await factory.createWallet();
    const wallets = await factory.getWallets(user.address);
    expect(wallets.length).to.equal(2);
  });
});

