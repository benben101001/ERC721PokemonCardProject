const hre = require("hardhat");

async function main() {
  // Deploy TradingPlatform
  const TradingPlatform = await hre.ethers.getContractFactory("TradingPlatform");
  const tradingPlatform = await TradingPlatform.deploy();
  await tradingPlatform.waitForDeployment();

  console.log("TradingPlatform deployed to:", tradingPlatform.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 