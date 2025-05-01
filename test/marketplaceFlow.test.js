const { expect } = require("chai");
const hre = require("hardhat");

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


describe("Pokemon NFT Marketplace Flow", function () {
    let pokemonCard, tradingPlatform;



    beforeEach(async () => {
        // Deploy contracts before each test
        pokemonCard = await hre.ethers.deployContract("PokemonCard", []);
        tradingPlatform = await hre.ethers.deployContract("TradingPlatform", []);

        console.log("PokemonCard address:", pokemonCard.target);
        console.log("TradingPlatform address:", tradingPlatform.target);
    });

    it("Should mint, list, buy, and withdraw", async function () {
        const [owner, seller, buyer] = await hre.ethers.getSigners();

        // Mint a PokemonCard for the seller
        const tokenURI = "ipfs://pikachu-metadata";
        await pokemonCard.connect(owner).mintCard(seller.address, tokenURI);

        // Seller approves TradingPlatform to transfer the PokemonCard NFT
        await pokemonCard.connect(seller).approve(tradingPlatform.target, 1);

        // List the card on the TradingPlatform
        const price = hre.ethers.parseEther("1");
        await tradingPlatform.connect(seller).listCard(pokemonCard.target, 1, price);
        await wait(5000);
        
        // Check the listing
        const listing = await tradingPlatform.listings(0);
        expect(listing.tokenId).to.equal(1);
        expect(listing.price).to.equal(price);
        expect(listing.seller).to.equal(seller.address);

        // Buyer buys the NFT
        await tradingPlatform.connect(buyer).buyCard(0, { value: price });

        // Check that ownership has transferred to the buyer
        expect(await pokemonCard.ownerOf(1)).to.equal(buyer.address);

        // Seller withdraws the funds
        const initialBalance = await hre.ethers.provider.getBalance(seller.address);
        await tradingPlatform.connect(seller).withdraw();
        const finalBalance = await hre.ethers.provider.getBalance(seller.address);

        
      

        // Check that the seller has received ETH (with gas considerations)
        expect(finalBalance > initialBalance).to.be.true;

    });
});
