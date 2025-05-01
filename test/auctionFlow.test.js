const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@openzeppelin/test-helpers");

describe("AuctionPlatform with PokemonCard", function () {
  let auctionPlatform, pokemonCard, owner, seller, bidder1, bidder2;
  let nftContract, tokenId, duration = 3600; // 1 hour in seconds
  const bidAmount1 = ethers.parseEther("1");
  const bidAmount2 = ethers.parseEther("2");
  const tokenURI = "https://example.com/pokemon/1.json";
  let snapshotId;

  beforeEach(async function () {
    // Get signers
    [owner, seller, bidder1, bidder2] = await ethers.getSigners();

    // Take a snapshot to reset blockchain state
    snapshotId = await ethers.provider.send("evm_snapshot", []);

    // Deploy PokemonCard
    const PokemonCard = await ethers.getContractFactory("PokemonCard");
    pokemonCard = await PokemonCard.deploy();
    await pokemonCard.waitForDeployment();

    // Deploy AuctionPlatform
    const AuctionPlatform = await ethers.getContractFactory("AuctionPlatform");
    auctionPlatform = await AuctionPlatform.deploy(owner.address);
    await auctionPlatform.waitForDeployment();

    // Mint PokemonCard NFT to seller and approve AuctionPlatform
    await pokemonCard.connect(owner).mintCard(seller.address, tokenURI);
    tokenId = 1; // First token ID from mintCard
    await pokemonCard.connect(seller).approve(auctionPlatform.target, tokenId);

    nftContract = pokemonCard.target;
  });

  afterEach(async function () {
    // Revert to snapshot to reset blockchain state
    await ethers.provider.send("evm_revert", [snapshotId]);
  });

  describe("startAuction", function () {
    it("should start an auction and transfer PokemonCard NFT", async function () {
      // Get current timestamp and convert to number
      const startTime = (await time.latest()).toNumber();
      const nextTimestamp = startTime + 100; // Increment by 100 seconds
      await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp

      //the +1 is because of the timeblock disrepencys...
      const expectedEndTime = nextTimestamp + duration+1;

      // Debug types and values
      console.log("startTime:", typeof startTime, startTime);
      console.log("nextTimestamp:", typeof nextTimestamp, nextTimestamp);
      console.log("duration:", typeof duration, duration);
      console.log("expectedEndTime:", typeof expectedEndTime, expectedEndTime);

      await expect(
        auctionPlatform.connect(seller).startAuction(nftContract, tokenId, duration)
      )
        .to.emit(auctionPlatform, "AuctionStarted")
        .withArgs(0, seller.address, nftContract, tokenId, expectedEndTime);

      const auction = await auctionPlatform.getAuction(0);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.nftContract).to.equal(nftContract);
      expect(auction.tokenId).to.equal(tokenId);
      expect(auction.ended).to.be.false;
      expect(await pokemonCard.ownerOf(tokenId)).to.equal(auctionPlatform.target);
    });

    it("should revert if NFT transfer fails", async function () {
      await pokemonCard.connect(seller).approve(ethers.ZeroAddress, tokenId); // Revoke approval
      await expect(
        auctionPlatform.connect(seller).startAuction(nftContract, tokenId, duration)
      ).to.be.reverted; // Generic revert check
    });
  });

  describe("bid", function () {
    let auctionId = 0;
    beforeEach(async function () {
      // Set a specific timestamp for auction start
      const startTime = (await time.latest()).toNumber();
      const nextTimestamp = startTime + 100;
      await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp
      await auctionPlatform.connect(seller).startAuction(nftContract, tokenId, duration);
    });

    it("should place a valid bid", async function () {
      await expect(
        auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 })
      )
        .to.emit(auctionPlatform, "BidPlaced")
        .withArgs(auctionId, bidder1.address, bidAmount1);

      const auction = await auctionPlatform.getAuction(auctionId);
      expect(auction.highestBid).to.equal(bidAmount1);
      expect(auction.highestBidder).to.equal(bidder1.address);
    });

    it("should update highest bid and track previous bidder", async function () {
      await auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 });
      await auctionPlatform.connect(bidder2).bid(auctionId, { value: bidAmount2 });

      const auction = await auctionPlatform.getAuction(auctionId);
      expect(auction.highestBid).to.equal(bidAmount2);
      expect(auction.highestBidder).to.equal(bidder2.address);
      expect(await auctionPlatform.getPendingWithdrawal(auctionId, bidder1.address)).to.equal(bidAmount1);
    });

    it("should revert if bid is too low", async function () {
      await auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 });
      await expect(
        auctionPlatform.connect(bidder2).bid(auctionId, { value: bidAmount1 })
      ).to.be.revertedWith("Bid too low");
    });

    it("should revert if auction has ended", async function () {
      const auction = await auctionPlatform.getAuction(auctionId);
      const endTime = Number(auction.endTime);
      const currentTime = (await time.latest()).toNumber();
      const targetTime = Math.max(endTime + 100, currentTime + 100);

      // Debug time values
      console.log("bid test - endTime:", endTime);
      console.log("bid test - currentTime:", currentTime);
      console.log("bid test - targetTime:", targetTime);

      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp

      await expect(
        auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 })
      ).to.be.revertedWith("Auction ended");
    });
  });

  describe("withdraw", function () {
    let auctionId = 0;
    beforeEach(async function () {
      // Set a specific timestamp for auction start
      const startTime = (await time.latest()).toNumber();
      const nextTimestamp = startTime + 100;
      await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp
      await auctionPlatform.connect(seller).startAuction(nftContract, tokenId, duration);
      await auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 });
      await auctionPlatform.connect(bidder2).bid(auctionId, { value: bidAmount2 });
    });

    it("should allow bidder to withdraw funds", async function () {
      await expect(auctionPlatform.connect(bidder1).withdraw(auctionId))
        .to.emit(auctionPlatform, "Withdrawn")
        .withArgs(auctionId, bidder1.address, bidAmount1);

      expect(await auctionPlatform.getPendingWithdrawal(auctionId, bidder1.address)).to.equal(0);
      await expect(auctionPlatform.connect(bidder1).withdraw(auctionId)).to.be.revertedWith("Nothing to withdraw");
    });

    it("should revert if no funds to withdraw", async function () {
      await expect(auctionPlatform.connect(seller).withdraw(auctionId)).to.be.revertedWith("Nothing to withdraw");
    });
  });

  describe("endAuction", function () {
    let auctionId = 0;
    beforeEach(async function () {
      // Set a specific timestamp for auction start
      const startTime = (await time.latest()).toNumber();
      const nextTimestamp = startTime + 100;
      await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp
      await auctionPlatform.connect(seller).startAuction(nftContract, tokenId, duration);
    });

    it("should end auction with no bids and return NFT to seller", async function () {
      const auction = await auctionPlatform.getAuction(auctionId);
      const endTime = Number(auction.endTime);
      const currentTime = (await time.latest()).toNumber();
      const targetTime = Math.max(endTime + 100, currentTime + 100);

      // Debug time values
      console.log("endAuction no bids - endTime:", endTime);
      console.log("endAuction no bids - currentTime:", currentTime);
      console.log("endAuction no bids - targetTime:", targetTime);

      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp

      await expect(auctionPlatform.connect(seller).endAuction(auctionId))
        .to.emit(auctionPlatform, "AuctionEnded")
        .withArgs(auctionId, ethers.ZeroAddress, 0);

      const updatedAuction = await auctionPlatform.getAuction(auctionId);
      expect(updatedAuction.ended).to.be.true;
      expect(await pokemonCard.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("should end auction with bids and transfer NFT and funds", async function () {
      await auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 });
      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);

      const auction = await auctionPlatform.getAuction(auctionId);
      const endTime = Number(auction.endTime);
      const currentTime = (await time.latest()).toNumber();
      const targetTime = Math.max(endTime + 100, currentTime + 100);

      // Debug time values
      console.log("endAuction with bids - endTime:", endTime);
      console.log("endAuction with bids - currentTime:", currentTime);
      console.log("endAuction with bids - targetTime:", targetTime);

      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp

      await expect(auctionPlatform.connect(seller).endAuction(auctionId))
        .to.emit(auctionPlatform, "AuctionEnded")
        .withArgs(auctionId, bidder1.address, bidAmount1);

      const updatedAuction = await auctionPlatform.getAuction(auctionId);
      expect(updatedAuction.ended).to.be.true;
      expect(await pokemonCard.ownerOf(tokenId)).to.equal(bidder1.address);

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfter).to.be.greaterThan(sellerBalanceBefore);
    });

    it("should revert if auction not yet ended", async function () {
      await expect(auctionPlatform.connect(seller).endAuction(auctionId)).to.be.revertedWith("Auction not yet ended");
    });

    it("should revert if auction already ended", async function () {
      const auction = await auctionPlatform.getAuction(auctionId);
      const endTime = Number(auction.endTime);
      const currentTime = (await time.latest()).toNumber();
      const targetTime = Math.max(endTime + 100, currentTime + 100);

      // Debug time values
      console.log("endAuction already ended - endTime:", endTime);
      console.log("endAuction already ended - currentTime:", currentTime);
      console.log("endAuction already ended - targetTime:", targetTime);

      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp
      await auctionPlatform.connect(seller).endAuction(auctionId);

      await ethers.provider.send("evm_setNextBlockTimestamp", [targetTime + 100]);
      await ethers.provider.send("evm_mine", []); // Mine another block for the second call
      await expect(auctionPlatform.connect(seller).endAuction(auctionId)).to.be.revertedWith("Auction already ended");
    });
  });

  describe("getAuction and getPendingWithdrawal", function () {
    let auctionId = 0;
    beforeEach(async function () {
      // Set a specific timestamp for auction start
      const startTime = (await time.latest()).toNumber();
      const nextTimestamp = startTime + 100;
      await ethers.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
      await ethers.provider.send("evm_mine", []); // Mine a block to apply timestamp
      await auctionPlatform.connect(seller).startAuction(nftContract, tokenId, duration);
      await auctionPlatform.connect(bidder1).bid(auctionId, { value: bidAmount1 });
    });

    it("should return correct auction details", async function () {
      const auction = await auctionPlatform.getAuction(auctionId);
      expect(auction.seller).to.equal(seller.address);
      expect(auction.highestBid).to.equal(bidAmount1);
      expect(auction.highestBidder).to.equal(bidder1.address);
      expect(auction.nftContract).to.equal(nftContract);
      expect(await pokemonCard.tokenURI(tokenId)).to.equal(tokenURI);
    });

    it("should return correct pending withdrawal amount", async function () {
      await auctionPlatform.connect(bidder2).bid(auctionId, { value: bidAmount2 });
      expect(await auctionPlatform.getPendingWithdrawal(auctionId, bidder1.address)).to.equal(bidAmount1);
      expect(await auctionPlatform.getPendingWithdrawal(auctionId, bidder2.address)).to.equal(0);
    });
  });
});