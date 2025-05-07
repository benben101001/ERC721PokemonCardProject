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
import { CONTRACT_ADDRESSES } from './config';

// TODO: Replace with your deployed contract addresses
const POKEMON_CARD_ADDRESS = CONTRACT_ADDRESSES.POKEMON_CARD;
const TRADING_PLATFORM_ADDRESS = CONTRACT_ADDRESSES.TRADING_PLATFORM;
const AUCTION_PLATFORM_ADDRESS = CONTRACT_ADDRESSES.AUCTION_PLATFORM;

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
  const [sortOrder, setSortOrder] = useState("default");
  const [tradingPendingWithdrawals, setTradingPendingWithdrawals] = useState("0");

  // State variables for Auction Platform
  const [auctions, setAuctions] = useState([]);
  const [auctionTokenId, setAuctionTokenId] = useState("");
  const [auctionDuration, setAuctionDuration] = useState("");
  const [auctionStatus, setAuctionStatus] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState({});
  const [userNFTs, setUserNFTs] = useState([]);
  const [auctionStartAmount, setAuctionStartAmount] = useState("");

  /**
   * @dev Connect to MetaMask wallet on component mount
   * Sets up ethers provider and signer
   */
  useEffect(() => {
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          // Check if already connected
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            const prov = new ethers.BrowserProvider(window.ethereum);
            const signer = await prov.getSigner();
            setProvider(prov);
            setSigner(signer);
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };

    checkConnection();

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          // User disconnected their wallet
          disconnectWallet();
        } else {
          // Account changed
          setAccount(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        // Reload the page when chain changes
        window.location.reload();
      });
    }

    return () => {
      // Cleanup listeners
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', () => {});
        window.ethereum.removeListener('chainChanged', () => {});
      }
    };
  }, []);

  // Add this useEffect after the wallet connection useEffect
  useEffect(() => {
    if (account && provider) {
      console.log("Account changed, fetching NFTs...");
      fetchUserNFTs();
    }
  }, [account, provider]); // Dependencies include both account and provider

  // Add this useEffect after the other useEffects
  useEffect(() => {
    if (tab === 'market' && account) {
      console.log("Market tab selected, refreshing listings...");
      fetchListings();
    }
  }, [tab, account]);

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
        // Fetch pending withdrawals for the current account
        if (account) {
          const pendingAmount = await contract.pendingWithdrawals(account);
          setTradingPendingWithdrawals(pendingAmount.toString());
        }

        const totalListings = await Promise.race([
          contract.getListingCount(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Contract call timed out')), 30000))
        ]);
        
        console.log("Total listings:", totalListings.toString());
        
        const fetchedListings = [];
        for (let i = 0; i < totalListings; i++) {
          try {
            console.log(`Fetching listing ${i}...`);
            const listing = await contract.listings(i);
            
            // Only add valid listings (where seller is not zero address)
            if (listing && listing.seller && listing.seller !== ethers.ZeroAddress) {
              const tokenURI = await fetchTokenURI(listing.tokenId);
              
              // Fetch Pokemon data from IPFS
              let pokemonData = null;
              try {
                const ipfsUrl = tokenURI.startsWith('ipfs://')
                  ? tokenURI.replace('ipfs://', 'http://127.0.0.1:8080/ipfs/')
                  : `http://127.0.0.1:8080/ipfs/${tokenURI}`;
                
                const response = await fetch(ipfsUrl);
                if (response.ok) {
                  const data = await response.json();
                  pokemonData = {
                    name: data.name,
                    image: data.image.replace('ipfs://', 'http://127.0.0.1:8080/ipfs/'),
                    attributes: data.attributes
                  };
                }
              } catch (error) {
                console.error('Error fetching Pokemon data:', error);
              }
              
              fetchedListings.push({
                id: i,
                tokenId: listing.tokenId,
                price: listing.price,
                seller: listing.seller,
                nftContract: listing.nftContract,
                tokenURI: tokenURI,
                pokemonData: pokemonData
              });
            }
          } catch (error) {
            console.error(`Error fetching listing ${i}:`, error);
          }
        }
        console.log("Fetched listings with Pokemon data:", fetchedListings);
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

      // Get the current block timestamp
      const currentBlock = await provider.getBlock('latest');
      const currentTime = currentBlock.timestamp;

      for (let i = 0; i < count; i++) {
        try {
          const auction = await contract.getAuction(i);
          if (!auction.ended) {
            const endTime = Number(auction.endTime);
            const timeRemaining = endTime - currentTime - 300; // Subtract 300 seconds for display

            console.log('Auction debug:', {
              auctionId: i,
              endTime: endTime.toString(),
              endTimeDate: new Date(endTime * 1000).toUTCString(),
              currentTime: new Date(currentTime * 1000).toUTCString(),
              timeRemaining: timeRemaining
            });

            const tokenURI = await fetchTokenURI(auction.tokenId);
            newAuctions.push({
              id: i,
              tokenId: auction.tokenId,
              seller: auction.seller,
              endTime: auction.endTime,
              highestBid: auction.highestBid === 0n ? auction.startingAmount : auction.highestBid,
              highestBidder: auction.highestBidder,
              tokenURI: tokenURI,
              startingAmount: auction.startingAmount
            });

            // Check for pending withdrawals
            const withdrawalAmount = await contract.getPendingWithdrawal(i, account);
            if (withdrawalAmount > 0n) {
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
      
      // Check if approval is already granted
      const isApproved = await nftContract.getApproved(listTokenId);
      console.log("Current approval status:", isApproved);
      
      if (isApproved.toLowerCase() !== TRADING_PLATFORM_ADDRESS.toLowerCase()) {
        console.log("Approving TradingPlatform to handle NFT...");
        const approveTx = await nftContract.approve(TRADING_PLATFORM_ADDRESS, listTokenId);
        console.log("Approval transaction sent:", approveTx.hash);
        await approveTx.wait();
        console.log("Approval successful");
      } else {
        console.log("TradingPlatform already approved");
      }

      // Convert price from ETH to Wei
      const priceWei = ethers.parseEther(listPrice.toString());
      console.log("Listing price in Wei:", priceWei.toString());

      // Then list the NFT
      const tradingContract = new ethers.Contract(TRADING_PLATFORM_ADDRESS, tradingAbi.abi, signer);
      console.log("Sending list transaction...");
      const listTx = await tradingContract.listCard(POKEMON_CARD_ADDRESS, listTokenId, priceWei);
      console.log("List transaction sent:", listTx.hash);
      await listTx.wait();
      setListStatus("Listed!");
      
      // Reset form
      setListTokenId("");
      setListPrice("");
      
      // Refresh the listings
      fetchListings();
    } catch (e) {
      console.error("Listing error:", e);
      if (e.message.includes("user rejected")) {
        setListStatus("Transaction was rejected. Please try again.");
      } else if (e.message.includes("insufficient funds")) {
        setListStatus("Error: Insufficient funds for gas fees.");
      } else {
        setListStatus("Error: " + e.message);
      }
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
      // Refresh both listings and user's NFT collection
      await Promise.all([
        fetchListings(),
        fetchUserNFTs()
      ]);
    } catch (e) {
      alert("Error: " + e.message);
    }
  }

  /**
   * @dev Withdraws earnings from the TradingPlatform
   */
  const handleWithdrawTrading = async () => {
    try {
      const contract = new ethers.Contract(TRADING_PLATFORM_ADDRESS, tradingAbi.abi, signer);
      await contract.withdraw();
      alert("Withdrawn!");
      // Update pending withdrawals after successful withdrawal
      setTradingPendingWithdrawals("0");
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  /**
   * @dev Starts a new auction for a Pokémon card
   * @param tokenId The ID of the card to auction
   * @param duration The duration of the auction in seconds
   */
  const handleStartAuction = async () => {
    setAuctionStatus("Starting auction...");
    try {
      // Validate duration and starting amount
      const durationSeconds = parseInt(auctionDuration) + 1; // Add 1 second to account for block timestamp discrepancy
      const startAmountWei = ethers.parseEther(auctionStartAmount);
      
      if (isNaN(durationSeconds) || durationSeconds <= 1) {
        throw new Error("Please enter a valid duration in seconds");
      }
      
      if (isNaN(parseFloat(auctionStartAmount)) || parseFloat(auctionStartAmount) <= 0) {
        throw new Error("Please enter a valid starting amount");
      }

      console.log('Auction debug:', {
        inputDuration: auctionDuration,
        parsedDuration: durationSeconds,
        inputStartAmount: auctionStartAmount,
        parsedStartAmount: startAmountWei.toString(),
        currentTime: Math.floor(Date.now() / 1000),
        expectedEndTime: Math.floor(Date.now() / 1000) + durationSeconds
      });

      // First check if the NFT is already approved
      const nftContract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, signer);
      const isApproved = await nftContract.getApproved(auctionTokenId);
      console.log("Current approval status:", isApproved);
      
      // If not approved, request approval
      if (isApproved.toLowerCase() !== AUCTION_PLATFORM_ADDRESS.toLowerCase()) {
        console.log("Approving AuctionPlatform to handle NFT...");
        const approveTx = await nftContract.approve(AUCTION_PLATFORM_ADDRESS, auctionTokenId);
        console.log("Approval transaction sent:", approveTx.hash);
        await approveTx.wait();
        console.log("Approval successful");
      } else {
        console.log("AuctionPlatform already approved");
      }

      // Then start the auction
      const auctionContract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, signer);
      console.log("Starting auction with params:", {
        nftContract: POKEMON_CARD_ADDRESS,
        tokenId: auctionTokenId,
        duration: durationSeconds,
        startingAmount: startAmountWei.toString()
      });
      
      const tx = await auctionContract.startAuction(
        POKEMON_CARD_ADDRESS, 
        auctionTokenId, 
        durationSeconds,
        startAmountWei
      );
      console.log("Auction transaction sent:", tx.hash);
      const receipt = await tx.wait();
      console.log("Auction transaction receipt:", receipt);
      
      // Get the auction details after it's created
      const auctionId = await auctionContract.auctionCounter() - 1n;
      const auction = await auctionContract.getAuction(auctionId);
      console.log("Created auction details:", {
        auctionId: auctionId.toString(),
        endTime: auction.endTime.toString(),
        endTimeDate: new Date(Number(auction.endTime) * 1000).toLocaleString(),
        currentTime: new Date().toLocaleString()
      });
      
      setAuctionStatus("Auction started!");
      
      // Reset form
      setAuctionTokenId("");
      setAuctionDuration("");
      setAuctionStartAmount("");
      
      fetchAuctions();
    } catch (error) {
      console.error("Auction error:", error);
      if (error.message.includes("user rejected")) {
        setAuctionStatus("Transaction was rejected. Please try again.");
      } else if (error.message.includes("insufficient funds")) {
        setAuctionStatus("Error: Insufficient funds for gas fees.");
      } else if (error.message.includes("execution reverted")) {
        setAuctionStatus("Error: Contract rejected the transaction. Please check if you own the NFT and it's not already listed.");
      } else {
        setAuctionStatus("Error: " + error.message);
      }
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
    if (!provider || !account) {
      console.log("Cannot fetch NFTs: provider or account missing");
      return;
    }
    try {
      console.log("Starting NFT fetch for account:", account);
      const contract = new ethers.Contract(POKEMON_CARD_ADDRESS, pokemonCardAbi.abi, provider);
      const nfts = [];
      
      // Get the total supply of tokens
      const totalSupply = await contract.totalSupply();
      const totalSupplyNumber = Number(totalSupply);
      console.log("Total supply:", totalSupplyNumber);
      
      // Get the balance of the user
      const balance = await contract.balanceOf(account);
      const balanceNumber = Number(balance);
      console.log("User balance:", balanceNumber);
      
      // If user has no NFTs, return early
      if (balanceNumber === 0) {
        console.log("User has no NFTs");
        setUserNFTs([]);
        return;
      }
      
      // Check each token up to total supply
      let foundTokens = 0;
      for (let i = 1; i <= totalSupplyNumber && foundTokens < balanceNumber; i++) {
        try {
          const owner = await contract.ownerOf(i);
          if (owner.toLowerCase() === account.toLowerCase()) {
            console.log(`Found owned token ${i}`);
            const tokenURI = await contract.tokenURI(i);
            console.log(`Token ${i} URI:`, tokenURI);
            nfts.push({
              id: i,
              tokenURI: tokenURI
            });
            foundTokens++;
          }
        } catch (error) {
          // Skip tokens that don't exist
          if (error.message.includes("ERC721NonexistentToken")) {
            console.log(`Token ${i} does not exist, skipping...`);
          } else {
            console.error(`Error checking token ${i}:`, error);
          }
          continue;
        }
      }
      
      console.log("Final NFT list:", nfts);
      setUserNFTs(nfts);
    } catch (error) {
      console.error("Error fetching user NFTs:", error);
      setUserNFTs([]); // Reset NFTs on error
    }
  };

  const connectWallet = async () => {
    try {
      if (window.ethereum) {
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts.length > 0) {
          const prov = new ethers.BrowserProvider(window.ethereum);
          const signer = await prov.getSigner();
          setProvider(prov);
          setSigner(signer);
          setAccount(accounts[0]);
        }
      } else {
        alert("Please install MetaMask to use this application!");
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    }
  };

  const disconnectWallet = async () => {
    setAccount("");
    setProvider(null);
    setSigner(null);
    setListings([]);
    setAuctions([]);
    setUserNFTs([]);
    setPendingWithdrawals({});
  };

  // Update the sorting function to use pokemonData
  const getSortedListings = () => {
    const sortedListings = [...listings];
    switch (sortOrder) {
      case "price-high-low":
        return sortedListings.sort((a, b) => Number(b.price) - Number(a.price));
      case "price-low-high":
        return sortedListings.sort((a, b) => Number(a.price) - Number(b.price));
      case "name-asc":
        return sortedListings.sort((a, b) => {
          const nameA = a.pokemonData?.name?.toLowerCase() || "";
          const nameB = b.pokemonData?.name?.toLowerCase() || "";
          return nameA.localeCompare(nameB);
        });
      default:
        return sortedListings;
    }
  };

  // UI
  return (
    <div className="app-container">
      <div className="header">
        <h1 className="title" onClick={() => setTab('home')} style={{ cursor: 'pointer' }}>
          Pokémon NFT Marketplace
        </h1>
        <div className="wallet-connection">
          {account ? (
            <div className="wallet-info">
              <span className="account-address">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
              <button className="disconnect-button" onClick={disconnectWallet}>
                Disconnect
              </button>
            </div>
          ) : (
            <button className="connect-button" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
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
                <div className="listings-controls">
                  <button className="action-button" onClick={fetchListings}>Refresh</button>
                  <select 
                    value={sortOrder} 
                    onChange={e => setSortOrder(e.target.value)}
                    className="sort-select"
                  >
                    <option value="default">Default Order</option>
                    <option value="price-high-low">Price: High to Low</option>
                    <option value="price-low-high">Price: Low to High</option>
                    <option value="name-asc">Name: A to Z</option>
                  </select>
                  {tradingPendingWithdrawals !== "0" && (
                    <button className="action-button" onClick={handleWithdrawTrading}>
                      Withdraw {ethers.formatEther(tradingPendingWithdrawals)} ETH
                    </button>
                  )}
                </div>
                <div className="cards-grid">
                  {getSortedListings().map((listing) => (
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
                <input 
                  type="number"
                  placeholder="Starting Amount (ETH)" 
                  value={auctionStartAmount}
                  onChange={e => setAuctionStartAmount(e.target.value)}
                  min="0"
                  step="0.01"
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
                      provider={provider}
                      account={account}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'collection' && (
            <div>
              <h3>My Collection</h3>
              <button className="action-button" onClick={fetchUserNFTs}>Refresh Collection</button>
              <div className="cards-grid">
                {userNFTs.length === 0 ? (
                  <p>No Pokémon found in your collection. Try refreshing or check if your wallet is connected.</p>
                ) : (
                  userNFTs.map((nft) => (
                    <PokemonCard
                      key={nft.id}
                      pokemon={nft}
                      isAuction={false}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="connect-wallet">
          <HomePage setTab={setTab} />
        </div>
      )}
    </div>
  );
}

export default App;
