import { ethers } from "ethers";

const provider = new ethers.BrowserProvider(window.ethereum); // ethers v6
const signer = await provider.getSigner();

export { provider, signer };
