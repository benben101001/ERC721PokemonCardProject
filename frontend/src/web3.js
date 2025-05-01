// src/web3.js
import { ethers } from "ethers";

// Global variables to store provider and signer instances
let provider;
let signer;

/**
 * @dev Initializes web3 connection with MetaMask
 * @returns {Object} Object containing provider and signer instances
 * @throws {Error} If MetaMask is not installed
 * 
 * This function:
 * 1. Checks if MetaMask is installed
 * 2. Creates a new ethers provider using MetaMask
 * 3. Gets a signer for transaction signing
 * 4. Returns both provider and signer for use in the application
 */
async function initWeb3() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  // Create a new provider using MetaMask's injected ethereum object
  provider = new ethers.BrowserProvider(window.ethereum);
  
  // Get a signer for transaction signing
  signer = await provider.getSigner();

  return { provider, signer };
}

export { initWeb3 };

