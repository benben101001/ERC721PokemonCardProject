const hre = require("hardhat");

async function main() {
  try {
    // First check if we can connect to the network
    const provider = new hre.ethers.JsonRpcProvider("http://127.0.0.1:8545");
    console.log("Checking network connection...");
    
    try {
      const blockNumber = await provider.getBlockNumber();
      console.log("Connected to network. Current block:", blockNumber);
    } catch (error) {
      console.error("❌ Could not connect to local network. Is your Hardhat node running?");
      console.error("Try running: npx hardhat node");
      return;
    }

    const [deployer] = await hre.ethers.getSigners();
    console.log("Checking contract with account:", deployer.address);

    // The contract address from the latest deployment
    const contractAddress = "0x627b9A657eac8c3463AD17009a424dFE3FDbd0b1";

    // Check if there's any code at the contract address
    const code = await provider.getCode(contractAddress);
    console.log("Contract exists at address:", code !== "0x");

    if (code === "0x") {
      console.error("❌ No contract found at address", contractAddress);
      console.error("Try running: npx hardhat run scripts/deployAndMintPokemons.js --network localhost");
      return;
    }

    // Get the contract factory
    const TradingPlatform = await hre.ethers.getContractFactory("TradingPlatform");
    
    // Attach to the deployed contract
    const tradingPlatform = TradingPlatform.attach(contractAddress);

    // Try to call getListingCount
    try {
      const listingCount = await tradingPlatform.getListingCount();
      console.log("✅ Listing count:", listingCount.toString());
    } catch (error) {
      console.error("❌ Error calling getListingCount:", error.message);
      if (error.message.includes("require(false)")) {
        console.error("This error suggests a require statement in the contract failed.");
        console.error("Check the contract's getListingCount function implementation.");
      }
    }

    // Try to get a listing
    try {
      const listing = await tradingPlatform.listings(0);
      console.log("✅ First listing:", {
        seller: listing.seller,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        price: hre.ethers.formatEther(listing.price)
      });
    } catch (error) {
      console.error("❌ Error getting first listing:", error.message);
    }

  } catch (error) {
    console.error("Error:", error);
    if (error.message.includes("could not decode result")) {
      console.error("\n❌ Contract interaction failed. Make sure you:");
      console.error("1. Have a Hardhat node running (npx hardhat node)");
      console.error("2. Deploy the contract (npx hardhat run scripts/deployAndMintPokemons.js --network localhost)");
      console.error("3. Run this script with --network localhost flag");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 