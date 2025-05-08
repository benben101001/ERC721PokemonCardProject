import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import auctionAbi from '../abis/AuctionPlatform.json';
import { CONTRACT_ADDRESSES } from '../config';

const AUCTION_PLATFORM_ADDRESS = CONTRACT_ADDRESSES.AUCTION_PLATFORM;

const PokemonCard = ({ pokemon, onBuy, onBid, onEndAuction, onWithdraw, isAuction, isOwner, pendingWithdrawal, provider, account }) => {
  const [pokemonData, setPokemonData] = useState({
    name: "Loading...",
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png",
    height: 0,
    weight: 0,
    types: []
  });
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const [isExtended, setIsExtended] = useState(false);

  useEffect(() => {
    const fetchPokemonData = async () => {
      try {
        console.log("Pokemon data received:", pokemon);
        
        // Get the token URI (handle both tokenURI and uri properties)
        const uri = pokemon.tokenURI || pokemon.uri;
        if (!uri) {
          throw new Error("No URI found for Pokemon");
        }
        
        console.log("Using URI:", uri);
        
        // Convert the token URI to local IPFS URL
        const ipfsUrl = uri.startsWith('ipfs://')
          ? uri.replace('ipfs://', 'http://127.0.0.1:8080/ipfs/')
          : `http://127.0.0.1:8080/ipfs/${uri}`;
        
        console.log('Fetching from IPFS URL:', ipfsUrl);
        
        const response = await fetch(ipfsUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Fetched Pokemon data:', data);
        
        // Convert the image URI to local IPFS URL
        const imageUrl = data.image.replace('ipfs://', 'http://127.0.0.1:8080/ipfs/');
        console.log('Image URL:', imageUrl);

        // Extract types from attributes
        const types = data.attributes
          .filter(attr => attr.trait_type === 'Type')
          .map(attr => attr.value);
        
        console.log('Extracted types:', types);

        setPokemonData({
          name: data.name,
          image: imageUrl,
          height: data.attributes.find(attr => attr.trait_type === 'Height')?.value || 0,
          weight: data.attributes.find(attr => attr.trait_type === 'Weight')?.value || 0,
          types: types
        });
      } catch (error) {
        console.error('Error fetching Pokémon data:', error);
        // Set default data in case of error
        setPokemonData({
          name: "Error Loading Pokémon",
          image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png",
          height: 0,
          weight: 0,
          types: []
        });
      }
    };

    if (pokemon) {
      console.log("Attempting to fetch data for Pokemon:", pokemon);
      fetchPokemonData();
    } else {
      console.log("No Pokemon data provided");
    }
  }, [pokemon]);

  // Add event listener for bid events
  useEffect(() => {
    if (isAuction && pokemon.id !== undefined && provider) {
      try {
        const contract = new ethers.Contract(AUCTION_PLATFORM_ADDRESS, auctionAbi.abi, provider);
        
        const handleBid = (auctionId, bidder, amount) => {
          if (Number(auctionId) === pokemon.id) {
            const now = Math.floor(Date.now() / 1000);
            const endTime = Number(pokemon.endTime);
            const timeRemaining = endTime - now - 300; // Account for display offset
            
            if (timeRemaining <= 120) { // If less than 2 minutes remaining
              console.log('Bid placed in last 2 minutes:', {
                auctionId: auctionId.toString(),
                bidder: bidder,
                amount: ethers.formatEther(amount),
                timeRemaining: timeRemaining
              });
              setIsExtended(true);
            }
          }
        };

        contract.on("BidPlaced", handleBid);

        return () => {
          contract.off("BidPlaced", handleBid);
        };
      } catch (error) {
        console.error('Error setting up event listener:', error);
      }
    }
  }, [isAuction, pokemon.id, pokemon.endTime, provider]);

  useEffect(() => {
    if (isAuction && pokemon.endTime) {
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(pokemon.endTime) -300;
        const timeRemaining = endTime - now ; // Subtract 300 seconds for display
        
        if (timeRemaining <= 0) {
          setTimeLeft('Auction ended');
        } else {
          const hours = Math.floor(timeRemaining / 3600);
          const minutes = Math.floor((timeRemaining % 3600) / 60);
          const seconds = timeRemaining % 60;
          
          const timeString = `${hours}h ${minutes}m ${seconds}s`;
          setTimeLeft(isExtended ? `${timeString} (Extended)` : timeString);
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [isAuction, pokemon.endTime, isExtended]);

  const handleBid = () => {
    if (bidAmount && parseFloat(bidAmount) > 0) {
      onBid(pokemon, bidAmount);
    }
  };

  const formatAddress = (address) => {
    if (!address) return '';
    if (address.toLowerCase() === account?.toLowerCase()) {
      return 'You!';
    }
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="pokemon-card">
      <div className="pokemon-image">
        <img src={pokemonData.image} alt={pokemonData.name} />
      </div>
      <div className="pokemon-info">
        <h3>{pokemonData.name}</h3>
        <div className="pokemon-details">
          <p>Height: {pokemonData.height} cm</p>
          <p>Weight: {pokemonData.weight} kg</p>
          <div className="pokemon-types">
            {pokemonData.types.map((type, index) => (
              <span key={index} className={`type-badge type-${type.toLowerCase()}`}>
                {type}
              </span>
            ))}
          </div>
        </div>
        {(isAuction || onBuy) && (
          <div className="pokemon-price">
            {isAuction ? (
              <>
                <p>Current Bid: {ethers.formatEther(pokemon.highestBid || 0)} ETH</p>
                {pokemon.highestBidder && (
                  <p>Highest Bidder: {formatAddress(pokemon.highestBidder)}</p>
                )}
                <p>Ends at: {new Date(Number(pokemon.endTime) * 1000).toLocaleString()}</p>
                <p>Time left: {timeLeft}</p>
                
                {!pokemon.ended && (
                  <>
                    <input
                      type="number"
                      placeholder="Bid amount (ETH)"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                    <button onClick={handleBid} className="action-button">
                      Place Bid
                    </button>
                  </>
                )}
                {isOwner && !pokemon.ended && (
                  <button onClick={() => onEndAuction(pokemon)} className="action-button">
                    End Auction
                  </button>
                )}
                {pendingWithdrawal && (
                  <button onClick={() => onWithdraw(pokemon.id)} className="action-button">
                    Withdraw {pendingWithdrawal} ETH
                  </button>
                )}
              </>
            ) : onBuy && (
              <>
                <p>Price: {ethers.formatEther(pokemon.price || 0)} ETH</p>
                <button onClick={() => onBuy(pokemon)} className="action-button">
                  Buy Now
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PokemonCard; 