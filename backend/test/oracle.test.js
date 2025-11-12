
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PriceConsumerV3", function () {
  let MockV3Aggregator, PriceConsumer, mockAggregator, consumer;

  const DECIMALS = 8;
  const INITIAL_PRICE = 3000e8; // 3000 USD simulati

  beforeEach(async () => {
    // Deploy mock Chainlink Aggregator
    MockV3Aggregator = await ethers.getContractFactory("MockV3Aggregator");
    mockAggregator = await MockV3Aggregator.deploy(DECIMALS, INITIAL_PRICE);
    await mockAggregator.waitForDeployment();

    // Deploy del consumer
    PriceConsumer = await ethers.getContractFactory("PriceConsumerV3");
    consumer = await PriceConsumer.deploy();
    await consumer.waitForDeployment();

    await consumer.setPriceFeed(await mockAggregator.getAddress());
  });

  // Read price
  it("deve leggere il prezzo corretto dal feed", async () => {
    const price = await consumer.getLatestPrice();
    expect(price).to.equal(INITIAL_PRICE);
  });

  // Update price
  it("deve aggiornare il prezzo quando cambia nel feed", async () => {
    await mockAggregator.updateAnswer(3500e8);
    const newPrice = await consumer.getLatestPrice();
    expect(newPrice).to.equal(3500e8);
  });

  // Price
  it("deve restituire i decimali corretti dal feed", async () => {
    const decimals = await consumer.getDecimals();
    expect(decimals).to.equal(DECIMALS);
  });
});

