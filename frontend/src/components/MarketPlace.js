import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import tradingAbi from "../abis/TradingPlatform.json";

const contractAddress = "YOUR_CONTRACT_ADDRESS_HERE";

function Marketplace() {
    const [listings, setListings] = useState([]);

    useEffect(() => {
        loadListings();
    }, []);

    async function loadListings() {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(contractAddress, tradingAbi.abi, provider);
        const items = await contract.getListings();
        setListings(items);
    }

    async function buyCard(id, price) {
        const signer = new ethers.providers.Web3Provider(window.ethereum).getSigner();
        const contract = new ethers.Contract(contractAddress, tradingAbi.abi, signer);
        await contract.buyCard(id, { value: price });
    }

    return (
        <div>
            <h2>Marketplace</h2>
            {listings.map((item, index) => (
                <div key={index}>
                    <p>Card {item.tokenId} - Price: {ethers.utils.formatEther(item.price)} ETH</p>
                    <button onClick={() => buyCard(item.tokenId, item.price)}>Buy</button>
                </div>
            ))}
        </div>
    );
}

export default Marketplace;
