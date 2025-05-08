import React, { useState } from 'react';
import { ethers } from 'ethers';

const MintPokemonForm = ({ onMint, provider, signer, isOwner }) => {
  const [formData, setFormData] = useState({
    name: '',
    height: '',
    weight: '',
    type: '',
    image: null
  });
  const [previewUrl, setPreviewUrl] = useState('');
  const [mintingStatus, setMintingStatus] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        image: file
      }));
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadToIPFS = async (content) => {
    try {
      // Create FormData for the file
      const formData = new FormData();
      if (content instanceof File) {
        formData.append('file', content);
      } else {
        // If it's metadata, create a Blob
        const blob = new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' });
        formData.append('file', blob, 'metadata.json');
      }

      // Upload to IPFS
      const response = await fetch('http://localhost:5001/api/v0/add', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.Hash;
    } catch (error) {
      console.error('Error uploading to IPFS:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMintingStatus('Preparing metadata...');

    try {
      // Create metadata object following the OpenSea standard
      const metadata = {
        name: `${formData.name} Pokemon Card`,
        description: `A unique ${formData.type} type Pokemon`,
        external_url: "https://pokemons.example.com/",
        image: '', // Will be replaced with IPFS URL
        attributes: [
          {
            trait_type: "Height",
            value: parseInt(formData.height),
            display_type: "number"
          },
          {
            trait_type: "Weight",
            value: parseInt(formData.weight),
            display_type: "number"
          },
          {
            trait_type: "Type",
            value: formData.type
          }
        ]
      };

      // Upload image to IPFS
      setMintingStatus('Uploading image to IPFS...');
      const imageHash = await uploadToIPFS(formData.image);
      metadata.image = `ipfs://${imageHash}`;

      // Upload metadata to IPFS
      setMintingStatus('Uploading metadata to IPFS...');
      const metadataHash = await uploadToIPFS(metadata);
      const tokenURI = `ipfs://${metadataHash}`;

      // Mint the NFT with the IPFS metadata URL
      setMintingStatus('Minting NFT...');
      await onMint(tokenURI);

      setMintingStatus('Minting successful! Your Pokemon NFT has been created.');
      
      // Reset form
      setFormData({
        name: '',
        height: '',
        weight: '',
        type: '',
        image: null
      });
      setPreviewUrl('');
    } catch (error) {
      console.error('Error in minting process:', error);
      setMintingStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div className="mint-form" style={{ filter: isOwner ? 'none' : 'grayscale(100%)', opacity: isOwner ? 1 : 0.6 }}>
      <h2>Create Your Pokemon NFT</h2>
      {!isOwner && (
        <div style={{ color: 'red', marginBottom: '1em', fontWeight: 'bold' }}>
          Only the contract owner can mint new Pokemon cards. Contact the owner if you have good ideas.
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Pokemon Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            required
            disabled={!isOwner}
          />
        </div>

        <div className="form-group">
          <label htmlFor="height">Height (cm)</label>
          <input
            type="number"
            id="height"
            name="height"
            value={formData.height}
            onChange={handleInputChange}
            required
            disabled={!isOwner}
          />
        </div>

        <div className="form-group">
          <label htmlFor="weight">Weight (kg)</label>
          <input
            type="number"
            id="weight"
            name="weight"
            value={formData.weight}
            onChange={handleInputChange}
            required
            disabled={!isOwner}
          />
        </div>

        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleInputChange}
            required
            disabled={!isOwner}
          >
            <option value="">Select a type</option>
            <option value="Normal">Normal</option>
            <option value="Fire">Fire</option>
            <option value="Water">Water</option>
            <option value="Electric">Electric</option>
            <option value="Grass">Grass</option>
            <option value="Ice">Ice</option>
            <option value="Fighting">Fighting</option>
            <option value="Poison">Poison</option>
            <option value="Ground">Ground</option>
            <option value="Flying">Flying</option>
            <option value="Psychic">Psychic</option>
            <option value="Bug">Bug</option>
            <option value="Rock">Rock</option>
            <option value="Ghost">Ghost</option>
            <option value="Dragon">Dragon</option>
            <option value="Dark">Dark</option>
            <option value="Steel">Steel</option>
            <option value="Fairy">Fairy</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="image">Image</label>
          <input
            type="file"
            id="image"
            name="image"
            accept="image/*"
            onChange={handleImageChange}
            required
            disabled={!isOwner}
          />
        </div>

        <button type="submit" disabled={!isOwner}>Mint</button>
      </form>
      <div className="mint-status">{mintingStatus}</div>
      {previewUrl && (
        <div className="image-preview">
          <img src={previewUrl} alt="Preview" style={{ maxWidth: '200px', marginTop: '1em' }} />
        </div>
      )}
    </div>
  );
};

export default MintPokemonForm; 