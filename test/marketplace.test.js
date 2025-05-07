const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradingPlatform (Marketplace)", function () {
  let owner, seller, buyer, other, PokemonCard, TradingPlatform, card, market, tokenId;

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    TradingPlatform = await ethers.getContractFactory("TradingPlatform");
    card = await PokemonCard.deploy();
    market = await TradingPlatform.deploy();
    // Mint a card to seller
    await card.connect(owner).mintCard(seller.address, "ipfs://testuri");
    tokenId = 1;
    await card.connect(seller).approve(market.address, tokenId);
  });

  it("should list a card and emit event", async function () {
    await expect(market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1")))
      .to.emit(market, "CardListed")
      .withArgs(seller.address, card.address, tokenId, ethers.parseEther("1"), 0);
    expect(await card.ownerOf(tokenId)).to.equal(market.address);
  });

  it("should allow buying a listed card and emit event", async function () {
    await market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"));
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") }))
      .to.emit(market, "CardBought")
      .withArgs(buyer.address, card.address, tokenId, ethers.parseEther("1"), 0);
    expect(await card.ownerOf(tokenId)).to.equal(buyer.address);
    expect(await market.pendingWithdrawals(seller.address)).to.equal(ethers.parseEther("1"));
  });

  it("should not allow buying with insufficient funds", async function () {
    await market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"));
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("0.5") })).to.be.revertedWith("Insufficient payment");
  });

  it("should allow seller to withdraw funds and emit event", async function () {
    await market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    await expect(market.connect(seller).withdraw())
      .to.emit(market, "Withdrawn")
      .withArgs(seller.address, ethers.parseEther("1"));
    expect(await market.pendingWithdrawals(seller.address)).to.equal(0);
  });

  it("should not allow non-owner to pause/unpause", async function () {
    await expect(market.connect(buyer).pause()).to.be.reverted;
    await expect(market.connect(owner).pause()).to.not.be.reverted;
    await expect(market.connect(owner).unpause()).to.not.be.reverted;
  });

  it("should not allow listing, buying, or withdrawing when paused", async function () {
    await market.connect(owner).pause();
    await expect(market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"))).to.be.reverted;
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") })).to.be.reverted;
    await expect(market.connect(seller).withdraw()).to.be.reverted;
  });

  it("should not allow buying unlisted cards", async function () {
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") })).to.be.reverted;
  });
}); 