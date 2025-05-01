const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Checking with account:", signer.address);

  // Connect to the deployed contracts
  const tradingPlatform = await hre.ethers.getContractAt(
    "TradingPlatform",
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
  );

  // Get the listing counter
  const listingCounter = await tradingPlatform.listingCounter();
  console.log("Total listings:", listingCounter.toString());

  console.log("Checking listings...");
  for (let i = 0; i < listingCounter; i++) {
    try {
      const listing = await tradingPlatform.listings(i);
      console.log(`Listing ${i}:`, {
        seller: listing.seller,
        nftContract: listing.nftContract,
        tokenId: listing.tokenId.toString(),
        price: hre.ethers.formatEther(listing.price)
      });
    } catch (e) {
      console.log(`Error checking listing ${i}:`, e.message);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 