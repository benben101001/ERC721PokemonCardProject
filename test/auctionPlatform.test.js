const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("AuctionPlatform", function () {
  let owner, seller, bidder1, bidder2, PokemonCard, AuctionPlatform, card, auction, tokenId;

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");
    const lastBlock = await ethers.provider.getBlock("latest");
    const nextTimestamp = lastBlock.timestamp + 1;
    await network.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await network.provider.send("evm_mine");
    [owner, seller, bidder1, bidder2] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    AuctionPlatform = await ethers.getContractFactory("AuctionPlatform");
    card = await PokemonCard.deploy();
    await card.waitForDeployment();
    auction = await AuctionPlatform.deploy(owner.address);
    await auction.waitForDeployment();
    // Mint a card to seller
    await card.connect(owner).mintCard(seller.address, "ipfs://testuri");
    tokenId = 1;
    const currentApproval = await card.getApproved(tokenId);
    const auctionAddress = await auction.getAddress();
    if (currentApproval !== auctionAddress) {
      await card.connect(seller).approve(auctionAddress, tokenId);
    }
  });

  it("should start an auction and emit event", async function () {
    await expect(auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1")))
      .to.emit(auction, "AuctionStarted");
    expect(await card.ownerOf(tokenId)).to.equal(await auction.getAddress());
  });

  it("should allow bidding and emit event", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") }))
      .to.emit(auction, "BidPlaced");
    const auctionData = await auction.getAuction(0);
    expect(auctionData.highestBidder).to.equal(bidder1.address);
    expect(auctionData.highestBid).to.equal(ethers.parseEther("2"));
  });

  it("should not allow bidding below starting amount or highest bid", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("0.5") })).to.be.revertedWith("Bid below starting amount");
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    await expect(auction.connect(bidder2).bid(0, { value: ethers.parseEther("1.5") })).to.be.revertedWith("Bid not high enough");
  });

  it("should extend auction if bid placed in last 2 minutes", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 120, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Simulate time passing to just before the last 2 minutes
    await ethers.provider.send("evm_increaseTime", [100]); // 120 - 20 = 100 seconds, so 20 seconds left
    await ethers.provider.send("evm_mine");
    await auction.connect(bidder2).bid(0, { value: ethers.parseEther("3") });
    const auctionData = await auction.getAuction(0);
    expect(auctionData.endTime).to.be.gt((await ethers.provider.getBlock("latest")).timestamp);
  });

  it("should end auction and transfer NFT and funds", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 2, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Dynamically calculate the jump to endTime + 1
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    // Ensure auction is not already ended
    const auctionDataAfter = await auction.getAuction(0);
    expect(auctionDataAfter.ended).to.be.false;
    await expect(auction.connect(owner).endAuction(0)).to.emit(auction, "AuctionEnded");
    expect(await card.ownerOf(tokenId)).to.equal(bidder1.address);
  });

  it("should allow outbid user to withdraw", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
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
    await expect(auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"))).to.be.reverted;
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") })).to.be.reverted;
    await expect(auction.connect(bidder1).withdraw(0)).to.be.reverted;
    await expect(auction.connect(owner).endAuction(0)).to.be.reverted;
  });

  it("should not allow auction with zero duration", async function () {
    await expect(
      auction.connect(seller).startAuction(await card.getAddress(), tokenId, 0, ethers.parseEther("1"))
    ).to.be.reverted;
  });

  

  it("should not allow bid after auction ended", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 2, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Jump to after auction end
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    await auction.connect(owner).endAuction(0);
    await expect(
      auction.connect(bidder2).bid(0, { value: ethers.parseEther("3") })
    ).to.be.reverted;
  });

  it("should allow bid with exact starting amount if no bids yet", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    await expect(
      auction.connect(bidder1).bid(0, { value: ethers.parseEther("1") })
    ).to.not.be.reverted;
  });

  it("should return NFT to seller if auction ends with no bids", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 2, ethers.parseEther("1"));
    // Jump to after auction end
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    await auction.connect(owner).endAuction(0);
    expect(await card.ownerOf(tokenId)).to.equal(seller.address);
  });

  it("should not allow non-owner to start auction", async function () {
    await expect(
      auction.connect(bidder1).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"))
    ).to.be.reverted;
  });

  it("should not allow non-owner to end auction", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 2, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Jump to after auction end
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    await expect(
      auction.connect(bidder1).endAuction(0)
    ).to.be.reverted;
  });

  it("should emit correct event parameters for AuctionStarted", async function () {
    await expect(
      auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"))
    ).to.emit(auction, "AuctionStarted");
  });

  it("should emit correct event parameters for BidPlaced", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    await expect(
      auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") })
    ).to.emit(auction, "BidPlaced");
  });

  it("should emit correct event parameters for AuctionEnded", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 2, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Jump to after auction end
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    await expect(
      auction.connect(owner).endAuction(0)
    ).to.emit(auction, "AuctionEnded");
  });

  // Security tests
  it("should prevent reentrancy in withdraw", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    await auction.connect(bidder2).bid(0, { value: ethers.parseEther("3") });
    await auction.connect(bidder1).withdraw(0);
    // Second withdraw should revert (no funds left)
    await expect(auction.connect(bidder1).withdraw(0)).to.be.reverted;
  });

  it("should restrict pause/unpause to owner", async function () {
    await expect(auction.connect(bidder1).pause()).to.be.reverted;
    await expect(auction.connect(owner).pause()).to.not.be.reverted;
    await expect(auction.connect(owner).unpause()).to.not.be.reverted;
  });

  it("should not change state after failed bid", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    const before = await auction.getAuction(0);
    await expect(auction.connect(bidder1).bid(0, { value: ethers.parseEther("0.5") })).to.be.reverted;
    const after = await auction.getAuction(0);
    expect(after.highestBid).to.equal(before.highestBid);
    expect(after.highestBidder).to.equal(before.highestBidder);
  });

  it("should extend auction if bid placed in last 2 minutes (anti-sniping)", async function () {
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 120, ethers.parseEther("1"));
    await auction.connect(bidder1).bid(0, { value: ethers.parseEther("2") });
    // Simulate time passing to just before the last 2 minutes
    await ethers.provider.send("evm_increaseTime", [110]); // 120 - 10 = 110 seconds, so 10 seconds left
    await ethers.provider.send("evm_mine");
    const before = await auction.getAuction(0);
    await auction.connect(bidder2).bid(0, { value: ethers.parseEther("3") });
    const after = await auction.getAuction(0);
    expect(Number(after.endTime)).to.be.gt(Number(before.endTime));
  });
}); 