const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  // Deploy PokemonCard
  const pokemonCard = await hre.ethers.deployContract("PokemonCard");
  await pokemonCard.waitForDeployment();
  console.log("PokemonCard deployed to:", pokemonCard.target);

  // Deploy TradingPlatform
  const tradingPlatform = await hre.ethers.deployContract("TradingPlatform");
  await tradingPlatform.waitForDeployment();
  console.log("TradingPlatform deployed to:", tradingPlatform.target);

  // IPFS metadata links (expandable)
  const pokemonMetadatas = [
    "ipfs://bafkreihsjdpo6tgeixkxdvzcmjeadtpbqfmz6bjgw3wi5ushesrul4sycm", // Bulbasaur
  ];

  const defaultPrice = hre.ethers.parseEther("0.1");

  for (let i = 0; i < pokemonMetadatas.length; i++) {
    const tokenURI = pokemonMetadatas[i];

    // Mint the card to deployer
    const mintTx = await pokemonCard.mintCard(deployer.address, tokenURI);
    await mintTx.wait();

    const tokenId = i + 1;

    // Approve the marketplace
    const approveTx = await pokemonCard.approve(tradingPlatform.target, tokenId);
    await approveTx.wait();

    // List on marketplace
    const listTx = await tradingPlatform.listCard(pokemonCard.target, tokenId, defaultPrice);
    await listTx.wait();

    console.log(`Minted & listed Pokémon #${tokenId} for 0.1 ETH`);
  }

  console.log("✅ Initialization complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
