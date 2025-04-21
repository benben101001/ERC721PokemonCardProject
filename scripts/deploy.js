const hre = require("hardhat");

async function main() {
  const PokemonCard = await hre.ethers.getContractFactory("PokemonCard");
  const pokemonCard = await PokemonCard.deploy();  // Deploying the contract

  console.log(`PokemonCard deployed to: ${pokemonCard.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

