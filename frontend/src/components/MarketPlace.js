// src/components/Marketplace.js
import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import tradingAbi from "../abis/TradingPlatform.json";
import { initWeb3 } from "../web3";
import pokemonCardAbi from "../abis/PokemonCard.json";

// 🔁 replace with your actual deployed address
const contractAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const POKEMON_CARD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function Marketplace() {
  const [listings, setListings] = useState([]);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const { provider } = await initWeb3();
        const marketplaceContract = new ethers.Contract(contractAddress, tradingAbi.abi, provider);
        setContract(marketplaceContract);
        const items = await getListings();
        setListings(items);
      } catch (err) {
        console.error("Error loading listings:", err);
      }
    };

    init();
  }, []);

  async function getListings() {
    if (!contract) return [];
    let items = [];
    
    // Try to get listings for the first 100 tokens (since we know we minted 100)
    for (let i = 0; i < 100; i++) {
      try {
        const listing = await contract.listings(i);
        if (listing.seller !== ethers.ZeroAddress) {
          items.push({
            tokenId: i,
            price: listing.price,
            seller: listing.seller
          });
        }
      } catch (e) {
        console.log(`Token ${i} not listed`);
      }
    }
    return items;
  }

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
