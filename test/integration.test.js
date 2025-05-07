const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full Project Integration", function () {
  let owner, seller, buyer, bidder, PokemonCard, TradingPlatform, AuctionPlatform, card, market, auction, tokenId;

  beforeEach(async function () {
    [owner, seller, buyer, bidder] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    TradingPlatform = await ethers.getContractFactory("TradingPlatform");
    AuctionPlatform = await ethers.getContractFactory("AuctionPlatform");
    card = await PokemonCard.deploy();
    market = await TradingPlatform.deploy();
    auction = await AuctionPlatform.deploy(owner.address);
    // Mint a card to seller
    await card.connect(owner).mintCard(seller.address, "ipfs://testuri");
    tokenId = 1;
  });

  it("should mint, list, buy, and withdraw in sequence", async function () {
    await card.connect(seller).approve(market.address, tokenId);
    await market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    expect(await card.ownerOf(tokenId)).to.equal(buyer.address);
    expect(await market.pendingWithdrawals(seller.address)).to.equal(ethers.parseEther("1"));
    await expect(market.connect(seller).withdraw()).to.emit(market, "Withdrawn");
  });

  it("should mint, start auction, bid, extend, end, and withdraw", async function () {
    await card.connect(seller).approve(auction.address, tokenId);
    await auction.connect(seller).startAuction(card.address, tokenId, 120, ethers.parseEther("1"));
    await auction.connect(buyer).bid(0, { value: ethers.parseEther("2") });
    // Simulate time passing to last 2 minutes
    await ethers.provider.send("evm_increaseTime", [119]);
    await ethers.provider.send("evm_mine");
    await auction.connect(bidder).bid(0, { value: ethers.parseEther("3") });
    // Simulate auction end
    await ethers.provider.send("evm_increaseTime", [121]);
    await ethers.provider.send("evm_mine");
    await auction.connect(owner).endAuction(0);
    expect(await card.ownerOf(tokenId)).to.equal(bidder.address);
    await expect(auction.connect(buyer).withdraw(0)).to.emit(auction, "Withdrawn");
  });

  it("should pause and unpause both platforms and block actions", async function () {
    await card.connect(seller).approve(market.address, tokenId);
    await market.connect(owner).pause();
    await expect(market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"))).to.be.reverted;
    await market.connect(owner).unpause();
    await expect(market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"))).to.not.be.reverted;

    await card.connect(seller).approve(auction.address, tokenId);
    await auction.connect(owner).pause();
    await expect(auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1"))).to.be.reverted;
    await auction.connect(owner).unpause();
    await expect(auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1"))).to.not.be.reverted;
  });

  it("should maintain correct ownership and balances after full flows", async function () {
    // Mint and list
    await card.connect(seller).approve(market.address, tokenId);
    await market.connect(seller).listCard(card.address, tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    expect(await card.ownerOf(tokenId)).to.equal(buyer.address);
    // Buyer starts auction
    await card.connect(buyer).approve(auction.address, tokenId);
    await auction.connect(buyer).startAuction(card.address, tokenId, 100, ethers.parseEther("1"));
    await auction.connect(bidder).bid(0, { value: ethers.parseEther("2") });
    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine");
    await auction.connect(owner).endAuction(0);
    expect(await card.ownerOf(tokenId)).to.equal(bidder.address);
  });
}); 