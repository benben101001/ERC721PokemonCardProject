// src/components/Marketplace.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import tradingAbi from "../abis/TradingPlatform.json";
import { initWeb3 } from "../web3";

// 🔁 replace with your actual deployed address
const contractAddress = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

function Marketplace() {
  const [listings, setListings] = useState([]);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { provider } = await initWeb3();
        const marketplaceContract = new ethers.Contract(contractAddress, tradingAbi.abi, provider);
        setContract(marketplaceContract);
        const items = await marketplaceContract.getListings();
        setListings(items);
      } catch (err) {
        console.error("Error loading listings:", err);
      }
    };

    init();
  }, []);

  async function buyCard(id, price) {
    try {
      const { signer } = await initWeb3();
      const marketplaceWithSigner = new ethers.Contract(contractAddress, tradingAbi.abi, signer);
      const tx = await marketplaceWithSigner.buyCard(id, { value: price });
      await tx.wait();
      alert("Purchase successful!");
    } catch (err) {
      console.error("Purchase failed:", err);
    }
  }

  return (
    <div>
      <h2>Marketplace</h2>
      {listings.length === 0 && <p>No listings found.</p>}
      {listings.map((item, index) => (
        <div key={index}>
          <p>
            Card #{item.tokenId.toString()} — Price: {ethers.formatEther(item.price)} ETH
          </p>
          <button onClick={() => buyCard(item.tokenId, item.price)}>Buy</button>
        </div>
      ))}
    </div>
  );
}

export default Marketplace;
