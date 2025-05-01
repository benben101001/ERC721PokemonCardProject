// Import required modules
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * @dev Main deployment function that:
 * 1. Deploys the PokemonCard and TradingPlatform contracts
 * 2. Loads Pokémon metadata from IPFS
 * 3. Mints all Pokémon cards
 * 4. Lists them on the marketplace
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PokemonCard contract
  const PokemonCard = await hre.ethers.getContractFactory("PokemonCard");
  const pokemonCard = await PokemonCard.deploy();
  await pokemonCard.waitForDeployment();
  const pokemonCardAddress = await pokemonCard.getAddress();
  console.log("PokemonCard deployed to:", pokemonCardAddress);

  // Deploy TradingPlatform contract
  const TradingPlatform = await hre.ethers.getContractFactory("TradingPlatform");
  const tradingPlatform = await TradingPlatform.deploy();
  await tradingPlatform.waitForDeployment();
  const tradingPlatformAddress = await tradingPlatform.getAddress();
  console.log("TradingPlatform deployed to:", tradingPlatformAddress);

  // Deploy AuctionPlatform contract with initialOwner parameter
  const AuctionPlatform = await hre.ethers.getContractFactory("AuctionPlatform");
  const auctionPlatform = await AuctionPlatform.deploy(deployer.address);
  await auctionPlatform.waitForDeployment();
  const auctionPlatformAddress = await auctionPlatform.getAddress();
  console.log("AuctionPlatform deployed to:", auctionPlatformAddress);

  try {
    // Load Pokemon metadata
    const metadataPath = path.join(__dirname, "../mint_metadata/pokemon_cid_mapping.json");
    const pokemonMetadata = JSON.parse(fs.readFileSync(metadataPath, "utf8"));

    // Mint Pokemon cards and list them on the marketplace
    const defaultPrice = hre.ethers.parseEther("0.1"); // 0.1 ETH

    for (const [pokemonName, metadataCid] of Object.entries(pokemonMetadata)) {
      console.log(`\nProcessing ${pokemonName}...`);

      try {
        // Mint the Pokemon card
        const mintTx = await pokemonCard.mintCard(deployer.address, metadataCid);
    await mintTx.wait();
        console.log(`Minted ${pokemonName} with metadata CID: ${metadataCid}`);

        // Get the token ID of the newly minted card
        const tokenId = await pokemonCard.totalSupply();

        // Approve the marketplace to handle the NFT
        const approveTx = await pokemonCard.approve(tradingPlatformAddress, tokenId);
    await approveTx.wait();
        console.log(`Approved TradingPlatform to handle token ${tokenId}`);

        // List the Pokemon on the marketplace
        const listTx = await tradingPlatform.listCard(pokemonCardAddress, tokenId, defaultPrice);
    await listTx.wait();
        console.log(`Listed ${pokemonName} for ${hre.ethers.formatEther(defaultPrice)} ETH`);

      } catch (error) {
        console.error(`Error processing ${pokemonName}:`, error);
      }
  }

    console.log("\nDeployment and minting completed!");
  } catch (error) {
    console.error("Error loading or processing metadata:", error);
    process.exit(1);
}
}

// Execute the deployment script and handle any errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
  console.error(error);
    process.exit(1);
});
