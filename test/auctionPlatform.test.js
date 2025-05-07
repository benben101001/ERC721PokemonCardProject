const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuctionPlatform", function () {
  let owner, seller, bidder1, bidder2, PokemonCard, AuctionPlatform, card, auction, tokenId;

  beforeEach(async function () {
    [owner, seller, bidder1, bidder2] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    AuctionPlatform = await ethers.getContractFactory("AuctionPlatform");
    card = await PokemonCard.deploy();
    auction = await AuctionPlatform.deploy(owner.address);
    // Mint a card to seller
    await card.connect(owner).mintCard(seller.address, "ipfs://testuri");
    tokenId = 1;
    await card.connect(seller).approve(auction.address, tokenId);
  });

  it("should start an auction and emit event", async function () {
    await expect(auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1")))
      .to.emit(auction, "AuctionStarted");
    expect(await card.ownerOf(tokenId)).to.equal(auction.address);
  });

  it("should allow bidding and emit event", async function () {
    await auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1"));
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") }))
      .to.emit(auction, "BidPlaced");
    const auctionData = await auction.getAuction(0);
    expect(auctionData.highestBidder).to.equal(bidder1.address);
    expect(auctionData.highestBid).to.equal(ethers.parseEther("2"));
  });

  it("should not allow bidding below starting amount or highest bid", async function () {
    await auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1"));
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("0.5") })).to.be.revertedWith("Bid below starting amount");
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    await expect(auction.connect(bidder2).bid(0, { value: ethers.parseEther("1.5") })).to.be.revertedWith("Bid not high enough");
  });

  it("should extend auction if bid placed in last 2 minutes", async function () {
    await auction.connect(seller).startAuction(card.address, tokenId, 120, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Simulate time passing to last 2 minutes
    await ethers.provider.send("evm_increaseTime", [119]);
    await ethers.provider.send("evm_mine");
    await auction.connect(bidder2).bid(0, { value: ethers.parseEther("3") });
    const auctionData = await auction.getAuction(0);
    expect(auctionData.endTime).to.be.gt((await ethers.provider.getBlock("latest")).timestamp);
  });

  it("should end auction and transfer NFT and funds", async function () {
    await auction.connect(seller).startAuction(card.address, tokenId, 2, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    await ethers.provider.send("evm_increaseTime", [3]);
    await ethers.provider.send("evm_mine");
    await expect(auction.connect(owner).endAuction(0)).to.emit(auction, "AuctionEnded");
    expect(await card.ownerOf(tokenId)).to.equal(bidder1.address);
  });

  it("should allow outbid user to withdraw", async function () {
    await auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    await auction.connect(bidder2).bid(0, { value: ethers.parseEther("3") });
    await expect(auction.connect(bidder1).withdraw(0)).to.emit(auction, "Withdrawn");
  });

  it("should not allow non-owner to pause/unpause", async function () {
    await expect(auction.connect(bidder1).pause()).to.be.reverted;
    await expect(auction.connect(owner).pause()).to.not.be.reverted;
    await expect(auction.connect(owner).unpause()).to.not.be.reverted;
  });

  it("should not allow start, bid, withdraw, or end when paused", async function () {
    await auction.connect(owner).pause();
    await expect(auction.connect(seller).startAuction(card.address, tokenId, 100, ethers.parseEther("1"))).to.be.reverted;
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") })).to.be.reverted;
    await expect(auction.connect(bidder1).withdraw(0)).to.be.reverted;
    await expect(auction.connect(owner).endAuction(0)).to.be.reverted;
  });
}); 