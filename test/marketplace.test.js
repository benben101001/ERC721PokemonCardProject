const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("TradingPlatform (Marketplace)", function () {
  let owner, seller, buyer, other, PokemonCard, TradingPlatform, card, market, tokenId;

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");
    const lastBlock = await ethers.provider.getBlock("latest");
    const nextTimestamp = lastBlock.timestamp + 1;
    await network.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await network.provider.send("evm_mine");
    [owner, seller, buyer, other] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    TradingPlatform = await ethers.getContractFactory("TradingPlatform");
    card = await PokemonCard.deploy();
    await card.waitForDeployment();
    market = await TradingPlatform.deploy();
    await market.waitForDeployment();
    // Mint a card to seller
    await card.connect(owner).mintCard(seller.address, "ipfs://testuri");
    tokenId = 1;
    await card.connect(seller).approve(await market.getAddress(), tokenId);
  });

  it("should list a card and emit event", async function () {
    await expect(market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1")))
      .to.emit(market, "CardListed")
      .withArgs(seller.address, await card.getAddress(), tokenId, ethers.parseEther("1"), 0);
    expect(await card.ownerOf(tokenId)).to.equal(await market.getAddress());
  });

  it("should allow buying a listed card and emit event", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") }))
      .to.emit(market, "CardBought")
      .withArgs(buyer.address, await card.getAddress(), tokenId, ethers.parseEther("1"), 0);
    expect(await card.ownerOf(tokenId)).to.equal(buyer.address);
    expect(await market.pendingWithdrawals(seller.address)).to.equal(ethers.parseEther("1"));
  });

  it("should not allow buying with insufficient funds", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("0.5") })).to.be.revertedWith("Insufficient payment");
  });

  it("should allow seller to withdraw funds and emit event", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
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
    await expect(market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"))).to.be.reverted;
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") })).to.be.reverted;
    await expect(market.connect(seller).withdraw()).to.be.reverted;
  });

  it("should not allow buying unlisted cards", async function () {
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") })).to.be.reverted;
  });

  it("should not allow double listing of the same NFT", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await card.connect(owner).mintCard(buyer.address, "ipfs://testuri2");
    const tokenId2 = 2;
    await card.connect(buyer).approve(await market.getAddress(), tokenId2);
    await market.connect(buyer).listCard(await card.getAddress(), tokenId2, ethers.parseEther("1"));
    // Try to list the same token again (should revert because it's not owned by seller anymore)
    await expect(market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"))).to.be.reverted;
  });

  it("should not allow buying a non-existent listing", async function () {
    await expect(market.connect(buyer).buyCard(999, { value: ethers.parseEther("1") })).to.be.reverted;
  });

  it("should not allow withdraw with zero balance", async function () {
    await expect(market.connect(buyer).withdraw()).to.be.revertedWith("No funds to withdraw");
  });

  it("should not allow non-owner to list NFT", async function () {
    await expect(market.connect(buyer).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"))).to.be.reverted;
  });

  it("should not allow non-owner to withdraw seller's funds", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    await expect(market.connect(other).withdraw()).to.be.revertedWith("No funds to withdraw");
  });

  it("should emit correct event parameters for CardListed", async function () {
    await expect(market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1")))
      .to.emit(market, "CardListed")
      .withArgs(seller.address, await card.getAddress(), tokenId, ethers.parseEther("1"), 0);
  });

  it("should emit correct event parameters for CardBought", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") }))
      .to.emit(market, "CardBought")
      .withArgs(buyer.address, await card.getAddress(), tokenId, ethers.parseEther("1"), 0);
  });

  it("should emit correct event parameters for Withdrawn", async function () {
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    await expect(market.connect(seller).withdraw())
      .to.emit(market, "Withdrawn")
      .withArgs(seller.address, ethers.parseEther("1"));
  });

  describe("Security", function () {
    it("should prevent reentrancy in withdraw", async function () {
      // Simulate a reentrancy attack by calling withdraw twice in a row
      await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
      await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
      await market.connect(seller).withdraw();
      // Second withdraw should revert (no funds left)
      await expect(market.connect(seller).withdraw()).to.be.revertedWith("No funds to withdraw");
    });

    it("should restrict pause/unpause to owner", async function () {
      await expect(market.connect(buyer).pause()).to.be.reverted;
      await expect(market.connect(owner).pause()).to.not.be.reverted;
      await expect(market.connect(owner).unpause()).to.not.be.reverted;
    });

    it("should not change state after failed buy", async function () {
      await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
      const before = await market.pendingWithdrawals(seller.address);
      await expect(market.connect(buyer).buyCard(0, { value: ethers.parseEther("0.5") })).to.be.reverted;
      const after = await market.pendingWithdrawals(seller.address);
      expect(after).to.equal(before);
    });
  });
}); 