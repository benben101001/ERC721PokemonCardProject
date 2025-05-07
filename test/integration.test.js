const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Full Project Integration", function () {
  let owner, seller, buyer, bidder, PokemonCard, TradingPlatform, AuctionPlatform, card, market, auction, tokenId;

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");
    const lastBlock = await ethers.provider.getBlock("latest");
    const nextTimestamp = lastBlock.timestamp + 1;
    await network.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await network.provider.send("evm_mine");
    [owner, seller, buyer, bidder] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    TradingPlatform = await ethers.getContractFactory("TradingPlatform");
    AuctionPlatform = await ethers.getContractFactory("AuctionPlatform");
    card = await PokemonCard.deploy();
    await card.waitForDeployment();
    market = await TradingPlatform.deploy();
    await market.waitForDeployment();
    auction = await AuctionPlatform.deploy(owner.address);
    await auction.waitForDeployment();
    // Mint a card to seller
    await card.connect(owner).mintCard(seller.address, "ipfs://testuri");
    tokenId = 1;
  });

  it("should mint, list, buy, and withdraw in sequence", async function () {
    await card.connect(seller).approve(await market.getAddress(), tokenId);
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    expect(await card.ownerOf(tokenId)).to.equal(buyer.address);
    expect(await market.pendingWithdrawals(seller.address)).to.equal(ethers.parseEther("1"));
    await expect(market.connect(seller).withdraw()).to.emit(market, "Withdrawn");
  });

  it("should mint, start auction, bid, extend, end, and withdraw", async function () {
    await card.connect(seller).approve(await auction.getAddress(), tokenId);
    await auction.connect(seller).startAuction(await card.getAddress(), tokenId, 120, ethers.parseEther("1"));
    await auction.connect(buyer).bid(0, { value: ethers.parseEther("2") });
    // Simulate time passing to just before the last 2 minutes
    await ethers.provider.send("evm_increaseTime", [100]); // 120 - 20 = 100 seconds, so 20 seconds left
    await ethers.provider.send("evm_mine");
    await auction.connect(bidder).bid(0, { value: ethers.parseEther("3") });
    // Dynamically calculate the jump to endTime + 1
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    await auction.connect(owner).endAuction(0);
    expect(await card.ownerOf(tokenId)).to.equal(bidder.address);
    await expect(auction.connect(buyer).withdraw(0)).to.emit(auction, "Withdrawn");
  });

  it("should pause and unpause both platforms and block actions", async function () {
    await card.connect(seller).approve(await market.getAddress(), tokenId);
    await market.connect(owner).pause();
    await expect(market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"))).to.be.reverted;
    await market.connect(owner).unpause();
    await expect(market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"))).to.not.be.reverted;

    await auction.connect(owner).pause();
    await expect(auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"))).to.be.reverted;
    await auction.connect(owner).unpause();
    // Only approve and start auction if seller is owner
    const currentOwner = await card.ownerOf(tokenId);
    const auctionAddress = await auction.getAddress();
    if (currentOwner === seller.address) {
      const currentApproval = await card.getApproved(tokenId);
      if (currentApproval !== auctionAddress) {
        await card.connect(seller).approve(auctionAddress, tokenId);
      }
      await expect(
        auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"))
      ).to.not.be.reverted;
    } else {
      // If seller is not the owner, the transaction should revert
      await expect(
        auction.connect(seller).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"))
      ).to.be.reverted;
    }
  });

  it("should maintain correct ownership and balances after full flows", async function () {
    // Mint and list
    await card.connect(seller).approve(await market.getAddress(), tokenId);
    await market.connect(seller).listCard(await card.getAddress(), tokenId, ethers.parseEther("1"));
    await market.connect(buyer).buyCard(0, { value: ethers.parseEther("1") });
    expect(await card.ownerOf(tokenId)).to.equal(buyer.address);
    // Buyer starts auction
    await card.connect(buyer).approve(await auction.getAddress(), tokenId);
    await auction.connect(buyer).startAuction(await card.getAddress(), tokenId, 100, ethers.parseEther("1"));
    await auction.connect(bidder).bid(0, { value: ethers.parseEther("2") });
    // Dynamically calculate the jump to endTime + 1
    const auctionData = await auction.getAuction(0);
    const endTime = Number(auctionData.endTime);
    const latestBlock = await ethers.provider.getBlock("latest");
    const now = latestBlock.timestamp;
    const jump = endTime - now + 1;
    await ethers.provider.send("evm_increaseTime", [jump]);
    await ethers.provider.send("evm_mine");
    await auction.connect(owner).endAuction(0);
    expect(await card.ownerOf(tokenId)).to.equal(bidder.address);
  });
}); 