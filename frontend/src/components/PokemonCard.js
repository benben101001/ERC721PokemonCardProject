import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const PokemonCard = ({ pokemon, onBuy, onBid, onEndAuction, onWithdraw, isAuction, isOwner, pendingWithdrawal }) => {
  const [pokemonData, setPokemonData] = useState({
    name: "Loading...",
    image: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png",
    height: 0,
    weight: 0,
    types: []
  });
  const [bidAmount, setBidAmount] = useState('');
  const [timeLeft, setTimeLeft] = useState('');

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

  useEffect(() => {
    if (isAuction && pokemon.endTime) {
      const updateTimer = () => {
        const now = Math.floor(Date.now() / 1000);
        const endTime = Number(pokemon.endTime) - 300;
        const timeRemaining = endTime - now;
        
        if (timeRemaining <= 0) {
          setTimeLeft('Auction ended');
        } else {
          const hours = Math.floor(timeRemaining / 3600);
          const minutes = Math.floor((timeRemaining % 3600) / 60);
          const seconds = timeRemaining % 60;
          setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
    }
  }, [isAuction, pokemon.endTime]);

  const handleBid = () => {
    if (bidAmount && parseFloat(bidAmount) > 0) {
      onBid(pokemon, bidAmount);
    }
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
                <p>Ends at: {new Date((Number(pokemon.endTime) - 300) * 1000).toLocaleString()}</p>
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