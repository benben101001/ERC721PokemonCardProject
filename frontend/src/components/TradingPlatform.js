import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import Web3Modal from "web3modal";
import { CONTRACT_ADDRESSES } from '../config';
import tradingAbi from '../abis/TradingPlatform.json';

//Auction Platform
const TradingPlatform = () => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [listings, setListings] = useState([]);
  const [nftContract, setNftContract] = useState("");
  const [tokenId, setTokenId] = useState("");
  const [price, setPrice] = useState("");

  useEffect(() => {
    const connectToWallet = async () => {
      const web3Modal = new Web3Modal();
      const connection = await web3Modal.connect();
      const ethersProvider = new ethers.providers.Web3Provider(connection);
      const signer = ethersProvider.getSigner();
      const tradingPlatformContract = new ethers.Contract(
        CONTRACT_ADDRESSES.TRADING_PLATFORM,
        tradingAbi.abi,
        signer
      );
      setProvider(ethersProvider);
      setContract(tradingPlatformContract);
      const userAccount = await signer.getAddress();
      setAccount(userAccount);
    };

    connectToWallet();
  }, []);

  const fetchListings = async () => {
    if (contract) {
      const totalListings = await contract.getListingCount();
      const fetchedListings = [];
      for (let i = 0; i < totalListings; i++) {
        const listing = await contract.listings(i);
        fetchedListings.push(listing);
      }
      setListings(fetchedListings);
    }
  };

  const handleListCard = async () => {
    if (contract) {
      await contract.listCard(nftContract, tokenId, ethers.utils.parseEther(price));
      alert("NFT listed successfully!");
    }
  };

  const handleBuyCard = async (listingId, price) => {
    if (contract) {
      await contract.buyCard(listingId, { value: price });
      alert("NFT purchased successfully!");
      fetchListings(); // Refresh listings after purchase
    }
  };

  const handleWithdraw = async () => {
    if (contract) {
      await contract.withdraw();
      alert("Funds withdrawn successfully!");
    }
  };

  return (
    <div>
      <h1>Pokémon NFT Trading Platform</h1>
      <p>Connected Account: {account}</p>

      <div>
        <h2>List Your NFT</h2>
        <input
          type="text"
          placeholder="NFT Contract Address"
          value={nftContract}
          onChange={(e) => setNftContract(e.target.value)}
        />
        <input
          type="text"
          placeholder="Token ID"
          value={tokenId}
          onChange={(e) => setTokenId(e.target.value)}
        />
        <input
          type="text"
          placeholder="Price (ETH)"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <button onClick={handleListCard}>List NFT</button>
      </div>

      <div>
        <h2>Available Listings</h2>
        <button onClick={fetchListings}>Fetch Listings</button>
        <ul>
          {listings.map((listing, index) => (
            <li key={index}>
              <p>
                Seller: {listing.seller} | Price: {ethers.utils.formatEther(listing.price)} ETH
              </p>
              <button onClick={() => handleBuyCard(index, listing.price)}>
                Buy NFT
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Withdraw Funds</h2>
        <button onClick={handleWithdraw}>Withdraw</button>
      </div>
    </div>
  );
};

export default TradingPlatform;
