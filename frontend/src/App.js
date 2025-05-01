// src/App.js
import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import pokemonCardAbi from "./abis/PokemonCard.json";
import tradingAbi from "./abis/TradingPlatform.json";
import auctionAbi from "./abis/AuctionPlatform.json";
import PokemonCard from "./components/PokemonCard";
import HomePage from "./components/HomePage";
import MintPokemonForm from "./components/MintPokemonForm";
import "./styles/App.css";

// TODO: Replace with your deployed contract addresses
const POKEMON_CARD_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const TRADING_PLATFORM_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const AUCTION_PLATFORM_ADDRESS = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0";

function App() {
  // State variables for wallet connection
  const [account, setAccount] = useState("");
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [tab, setTab] = useState("home");

  // State variables for Minting NFTs
  const [mintTo, setMintTo] = useState("");
  const [mintUri, setMintUri] = useState("");
  const [mintStatus, setMintStatus] = useState("");

  // State variables for Trading Platform
  const [listings, setListings] = useState([]);
  const [listTokenId, setListTokenId] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [listStatus, setListStatus] = useState("");

  // State variables for Auction Platform
  const [auctions, setAuctions] = useState([]);
  const [auctionTokenId, setAuctionTokenId] = useState("");
  const [auctionDuration, setAuctionDuration] = useState("");
  const [auctionStatus, setAuctionStatus] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState({});
  const [userNFTs, setUserNFTs] = useState([]);

  /**
   * @dev Connect to MetaMask wallet on component mount
   * Sets up ethers provider and signer
   */
  useEffect(() => {
    async function connect() {
      if (window.ethereum) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        const signer = await prov.getSigner();
        setProvider(prov);
        setSigner(signer);
        setAccount(await signer.getAddress());
      }
    }
    connect();
  }, []);

  const fetchTokenURI = async (tokenId) => {
    try {
      const contract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, provider);
      const uri = await contract.tokenURI(tokenId);
      return uri;
    } catch (error) {
      console.error('Error fetching token URI:', error);
      return null;
    }
  };

  /**
   * @dev Fetches all active listings from the TradingPlatform
   * Checks each possible listing index (0-99) for valid listings
   */
  const fetchListings = async () => {
    if (!provider) {
      console.error("Provider not initialized");
      return;
    }
    try {
      console.log("Fetching listings from address:", TRADING_PLATFORM_ADDRESS);
      const contract = new ethers.Contract(TRADING_PLATFORM_ADDRESS, tradingAbi.abi, provider);
      
      try {
        const totalListings = await contract.getListingCount();
        console.log("Total listings:", totalListings);
        
        const fetchedListings = [];
        for (let i = 0; i < totalListings; i++) {
          try {
            const listing = await contract.listings(i);
            // Only add valid listings (where seller is not zero address)
            if (listing && listing.seller && listing.seller !== ethers.ZeroAddress) {
              const tokenURI = await fetchTokenURI(listing.tokenId);
              fetchedListings.push({
                id: i,
                tokenId: listing.tokenId,
                price: listing.price,
                seller: listing.seller,
                nftContract: listing.nftContract,
                tokenURI: tokenURI
              });
            }
          } catch (error) {
            console.error(`Error fetching listing ${i}:`, error);
          }
        }
        console.log("Fetched listings:", fetchedListings);
        setListings(fetchedListings);
      } catch (error) {
        console.error("Error getting listing count:", error);
        setListings([]);
      }
    } catch (e) {
      console.error("Error in fetchListings:", e);
      setListings([]);
    }
  };

  /**
   * @dev Fetches all active auctions from the AuctionPlatform
   * Gets the total number of auctions and fetches each one
   */
  const fetchAuctions = async () => {
    if (!provider) return;
    const contract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, provider);
    try {
      const count = await contract.auctionCounter();
      const newAuctions = [];
      const newPendingWithdrawals = {};

      for (let i = 0; i < count; i++) {
        try {
          const auction = await contract.getAuction(i);
          if (!auction.ended) {
            console.log('Auction debug:', {
              auctionId: i,
              endTime: auction.endTime,
              endTimeDate: new Date(Number(auction.endTime) * 1000).toUTCString(),
              currentTime: new Date().toUTCString()
            });

            const tokenURI = await fetchTokenURI(auction.tokenId);
            newAuctions.push({
              id: i,
              tokenId: auction.tokenId,
              seller: auction.seller,
              endTime: auction.endTime,
              highestBid: auction.highestBid,
              highestBidder: auction.highestBidder,
              tokenURI: tokenURI
            });

            // Check for pending withdrawals
            const withdrawalAmount = await contract.getPendingWithdrawal(i, account);
            if (withdrawalAmount > 0) {
              newPendingWithdrawals[i] = ethers.formatEther(withdrawalAmount);
            }
          }
        } catch (error) {
          console.error(`Error fetching auction ${i}:`, error);
        }
      }
      setAuctions(newAuctions);
      setPendingWithdrawals(newPendingWithdrawals);
    } catch (error) {
      console.error("Error fetching auctions:", error);
    }
  };

  const handleMint = async (metadataUri) => {
    try {
      const contract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, signer);
      const tx = await contract.mintCard(account, metadataUri);
      const receipt = await tx.wait();

      // Get the token ID from the transfer event
      const transferEvent = receipt.logs.find(
        log => log.topics[0] === ethers.id("Transfer(address,address,uint256)")
      );
      const tokenId = parseInt(transferEvent.topics[3], 16);

      // Add the NFT to MetaMask
      try {
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC721',
            options: {
              address: POKEMON_CARD_ADDRESS,
              tokenId: tokenId.toString(),
            },
          },
        });
      } catch (error) {
        console.error("Error adding NFT to MetaMask:", error);
      }

      // Refresh the user's NFT collection
      await fetchUserNFTs();
      
      return true;
    } catch (error) {
      console.error("Error minting NFT:", error);
      throw error;
    }
  };

  /**
   * @dev Lists a Pokémon card for sale on the marketplace
   * @param tokenId The ID of the card to list
   * @param price The price in ETH
   */
  async function handleList() {
    if (!listTokenId || !listPrice) {
      setListStatus("Please select a Pokemon and enter a price");
      return;
    }

    setListStatus("Listing...");
    try {
      // First approve the TradingPlatform to handle the NFT
      const nftContract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, signer);
      const approveTx = await nftContract.approve(TRADING_PLATFORM_ADDRESS, listTokenId);
      await approveTx.wait();
      console.log("Approval successful");

      // Convert price from ETH to Wei
      const priceWei = ethers.parseEther(listPrice.toString());

      // Then list the NFT
      const tradingContract = new ethers.Contract(TRADING_PLATFORM_ADDRESS, tradingAbi.abi, signer);
      const listTx = await tradingContract.listCard(POKEMON_CARD_ADDRESS, listTokenId, priceWei);
      await listTx.wait();
      setListStatus("Listed!");
      
      // Reset form
      setListTokenId("");
      setListPrice("");
      
      // Refresh the listings
      fetchListings();
    } catch (e) {
      console.error("Listing error:", e);
      setListStatus("Error: " + e.message);
    }
  }

  /**
   * @dev Buys a listed Pokémon card
   * @param listing The listing object containing card details
   */
  async function handleBuy(listing) {
    try {
      const contract = new ethers.Contract(TRADING_PLATFORM_ADDRESS, tradingAbi.abi, signer);
      await contract.buyCard(listing.id, { value: listing.price });
      alert("Bought!");
      fetchListings();
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  /**
   * @dev Withdraws earnings from the TradingPlatform
   */
  async function handleWithdrawTrading() {
    try {
      const contract = new ethers.Contract(TRADING_PLATFORM_ADDRESS, tradingAbi.abi, signer);
      await contract.withdraw();
      alert("Withdrawn!");
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  /**
   * @dev Starts a new auction for a Pokémon card
   * @param tokenId The ID of the card to auction
   * @param duration The duration of the auction in seconds
   */
  const handleStartAuction = async () => {
    setAuctionStatus("Starting auction...");
    try {
      // Validate duration
      const durationSeconds = parseInt(auctionDuration);
      if (isNaN(durationSeconds) || durationSeconds <= 0) {
        throw new Error("Please enter a valid duration in seconds");
      }

      console.log('Duration debug:', {
        inputDuration: auctionDuration,
        parsedDuration: durationSeconds,
        type: typeof durationSeconds
      });

      // First approve the AuctionPlatform to handle the NFT
      const nftContract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, signer);
      const approveTx = await nftContract.approve(AUCTION_PLATFORM_ADDRESS, auctionTokenId);
      await approveTx.wait();
      console.log("Approval successful");

      // Then start the auction
      const auctionContract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, signer);
      const tx = await auctionContract.startAuction(POKEMON_CARD_ADDRESS, auctionTokenId, durationSeconds);
      await tx.wait();
      setAuctionStatus("Auction started!");
      fetchAuctions();
    } catch (error) {
      console.error("Auction error:", error);
      setAuctionStatus("Error: " + error.message);
    }
  };

  /**
   * @dev Places a bid on an active auction
   * @param auction The auction object to bid on
   */
  const handleBid = async (auction, bidAmount) => {
    try {
      const contract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, signer);
      const tx = await contract.bid(auction.id, { value: ethers.parseEther(bidAmount) });
      await tx.wait();
      alert("Bid placed successfully!");
      fetchAuctions();
    } catch (error) {
      alert("Error placing bid: " + error.message);
    }
  };

  /**
   * @dev Ends an active auction
   * @param auction The auction object to end
   */
  const handleEndAuction = async (auction) => {
    try {
      const contract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, signer);
      const tx = await contract.endAuction(auction.id);
      await tx.wait();
      alert("Auction ended successfully!");
      fetchAuctions();
    } catch (error) {
      alert("Error ending auction: " + error.message);
    }
  };

  /**
   * @dev Withdraws funds from an auction
   * @param auctionId The ID of the auction to withdraw from
   */
  const handleWithdrawAuction = async (auctionId) => {
    try {
      const contract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, signer);
      const tx = await contract.withdraw(auctionId);
      await tx.wait();
      alert("Funds withdrawn successfully!");
      fetchAuctions();
    } catch (error) {
      alert("Error withdrawing funds: " + error.message);
    }
  };

  const fetchUserNFTs = async () => {
    if (!provider || !account) return;
    try {
      const contract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, provider);
      const nfts = [];
      
      // Get the total supply of tokens
      const totalSupply = await contract.totalSupply();
      console.log("Total supply:", totalSupply);
      
      // Check each token
      for (let i = 0; i < totalSupply; i++) {
        try {
          const owner = await contract.ownerOf(i);
          if (owner.toLowerCase() === account.toLowerCase()) {
            const tokenURI = await contract.tokenURI(i);
            console.log(`Found NFT #${i} with URI:`, tokenURI);
            nfts.push({
              id: i,
              tokenURI: tokenURI // Changed from uri to tokenURI to match PokemonCard component
            });
          }
        } catch (error) {
          console.error(`Error checking token ${i}:`, error);
          continue;
        }
      }
      
      console.log("Found user NFTs:", nfts);
      setUserNFTs(nfts);
    } catch (error) {
      console.error("Error fetching user NFTs:", error);
    }
  };

  // Update the useEffect to fetch NFTs when account changes
  useEffect(() => {
    if (account) {
      fetchUserNFTs();
    }
  }, [account]);

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        const prov = new ethers.BrowserProvider(window.ethereum);
        const signer = await prov.getSigner();
        setProvider(prov);
        setSigner(signer);
        setAccount(await signer.getAddress());
      } else {
        alert("Please install MetaMask to use this application!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  // UI
  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title" onClick={() => setTab('home')} style={{ cursor: 'pointer' }}>
          Pokémon NFT Marketplace
        </h1>
      </div>
      
      {account ? (
        <>
          <div className="menu-container">
            <button 
              className={`tab-button ${tab === 'home' ? 'active' : ''}`} 
              onClick={() => setTab('home')}
            >
              Home
            </button>
            <button 
              className={`tab-button ${tab === 'mint' ? 'active' : ''}`} 
              onClick={() => setTab('mint')}
            >
              Mint Pokemon
            </button>
            <button 
              className={`tab-button ${tab === 'market' ? 'active' : ''}`} 
              onClick={() => setTab('market')}
            >
              Marketplace
            </button>
            <button 
              className={`tab-button ${tab === 'auction' ? 'active' : ''}`} 
              onClick={() => setTab('auction')}
            >
              Auctions
            </button>
            <button 
              className={`tab-button ${tab === 'collection' ? 'active' : ''}`} 
              onClick={() => setTab('collection')}
            >
              My Collection
            </button>
          </div>

          {tab === 'home' && <HomePage setTab={setTab} />}

          {tab === 'mint' && (
            <MintPokemonForm 
              onMint={handleMint}
              provider={provider}
              signer={signer}
            />
          )}

          {tab === 'market' && (
            <div>
              <div className="form-group">
                <h3>List NFT for Sale</h3>
                <select 
                  value={listTokenId} 
                  onChange={e => setListTokenId(e.target.value)}
                  className="nft-select"
                >
                  <option value="">Select a Pokemon to list</option>
                  {userNFTs.map(nft => (
                    <option key={nft.id} value={nft.id}>
                      NFT #{nft.id}
                    </option>
                  ))}
                </select>
                <input 
                  type="number" 
                  placeholder="Price (ETH)" 
                  value={listPrice} 
                  onChange={e => setListPrice(e.target.value)}
                  min="0"
                  step="0.01"
                />
                <button className="action-button" onClick={handleList}>List</button>
                <div>{listStatus}</div>
              </div>

              <div className="form-group">
                <h3>Available Listings</h3>
                <button className="action-button" onClick={fetchListings}>Refresh</button>
                <div className="cards-grid">
                  {listings.map((listing) => (
                    <PokemonCard
                      key={listing.id}
                      pokemon={listing}
                      onBuy={handleBuy}
                      isAuction={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'auction' && (
            <div>
              <div className="form-group">
                <h3>Start Auction</h3>
                <select 
                  value={auctionTokenId} 
                  onChange={e => setAuctionTokenId(e.target.value)}
                  className="nft-select"
                >
                  <option value="">Select an NFT to auction</option>
                  {userNFTs.map(nft => (
                    <option key={nft.id} value={nft.id}>
                      NFT #{nft.id}
                    </option>
                  ))}
                </select>
                <input 
                  placeholder="Duration (seconds)" 
                  value={auctionDuration} 
                  onChange={e => setAuctionDuration(e.target.value)} 
                />
                <button className="action-button" onClick={handleStartAuction}>Start Auction</button>
                <div>{auctionStatus}</div>
              </div>

              <div className="form-group">
                <h3>Active Auctions</h3>
                <button className="action-button" onClick={fetchAuctions}>Refresh</button>
                <div className="cards-grid">
                  {auctions.map((auction) => (
                    <PokemonCard
                      key={auction.id}
                      pokemon={auction}
                      onBid={handleBid}
                      onEndAuction={handleEndAuction}
                      onWithdraw={handleWithdrawAuction}
                      isAuction={true}
                      isOwner={auction.seller.toLowerCase() === account?.toLowerCase()}
                      pendingWithdrawal={pendingWithdrawals[auction.id]}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'collection' && (
            <div>
              <h3>My Collection</h3>
              <div className="cards-grid">
                {userNFTs.map((nft) => (
                  <PokemonCard
                    key={nft.id}
                    pokemon={nft}
                    isAuction={false}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="connect-wallet">
          <HomePage setTab={setTab} />
          <button className="connect-button" onClick={connectWallet}>
            Connect Wallet to Start
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
