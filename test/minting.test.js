const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("PokemonCard Minting", function () {
  let owner, user, PokemonCard, card;

  beforeEach(async function () {
    await network.provider.send("hardhat_reset");
    const lastBlock = await ethers.provider.getBlock("latest");
    const nextTimestamp = lastBlock.timestamp + 1;
    await network.provider.send("evm_setNextBlockTimestamp", [nextTimestamp]);
    await network.provider.send("evm_mine");
    [owner, user] = await ethers.getSigners();
    PokemonCard = await ethers.getContractFactory("PokemonCard");
    card = await PokemonCard.deploy();
    await card.waitForDeployment();
  });

  it("should allow only owner to mint", async function () {
    await expect(card.connect(owner).mintCard(owner.address, "ipfs://testuri"))
      .to.not.be.reverted;
    await expect(card.connect(user).mintCard(user.address, "ipfs://testuri2"))
      .to.be.reverted;
  });

  it("should mint NFT to recipient and set tokenURI", async function () {
    await card.connect(owner).mintCard(user.address, "ipfs://testuri");
    expect(await card.ownerOf(1)).to.equal(user.address);
    expect(await card.tokenURI(1)).to.equal("ipfs://testuri");
  });

  it("should increase total supply on mint", async function () {
    expect(await card.totalSupply()).to.equal(0);
    await card.connect(owner).mintCard(owner.address, "ipfs://testuri");
    expect(await card.totalSupply()).to.equal(1);
    await card.connect(owner).mintCard(owner.address, "ipfs://testuri2");
    expect(await card.totalSupply()).to.equal(2);
  });

  it("should return correct owner for ownerOfToken", async function () {
    await card.connect(owner).mintCard(user.address, "ipfs://testuri");
    expect(await card.ownerOfToken(1)).to.equal(user.address);
  });
}); 