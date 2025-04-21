// src/web3.js
import { ethers } from "ethers";

let provider;
let signer;

async function initWeb3() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  signer = await provider.getSigner();

  return { provider, signer };
}

export { initWeb3 };

