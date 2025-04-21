const hre = require("hardhat");

async function main() {
  const PokemonCard = await hre.ethers.getContractFactory("PokemonCard");
  const pokemonCard = await PokemonCard.deploy(); // deployment waits automatically in v6

  console.log(`PokemonCard deployed to: ${pokemonCard.target}`); // use `.target` instead of `.address`
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


