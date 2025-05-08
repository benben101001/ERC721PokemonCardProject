# Pokémon NFT Marketplace and Auction Platform

A decentralized marketplace for trading and auctioning Pokémon NFT cards, built with Solidity, Hardhat, and React.

## Features

- Mint unique Pokemon NFT cards with IPFS-hosted metadata
- List cards for sale in the marketplace
- Auction off your cards
- Buy and sell Pokemon cards with secure transactions
- Secure and transparent transactions with reentrancy protection

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v16 or higher)
- npm (v7 or higher)
- MetaMask browser extension
- IPFS Desktop or IPFS CLI
- Git

## Installation

1. Clone the repository:
```bash 
git clone https://github.com/benben101001/ERC721PokemonCardProject.git
cd NFT_Pokemon_Project
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

## Configuration

### 1. Hardhat Configuration
The `hardhat.config.js` file is already configured for local development. For production deployment, you'll need to:
- Add your network configurations (e.g., Sepolia, Mainnet)
- Add your private keys or environment variables for deployment
- Configure gas settings if needed

### 2. Contract Addresses
The contract addresses are already configured in `frontend/src/config.js`. If you deploy the contracts to a different network or with different addresses, you'll need to update this file with the new addresses.

### 3. IPFS Setup
1. Install IPFS Desktop or IPFS CLI
2. Start IPFS daemon:
```bash
ipfs daemon
```
3. Ensure IPFS is running on port 5001 (default)
4. 
In a new terminal:
```bash
npx hardhat run scripts/uploadPokemons.mjs
```

## Running the Application

### 1. Start Local Blockchain
```bash
npx hardhat node
```

### 2. Deploy Contracts
In a new terminal:
```bash
npx hardhat run scripts/deployAndMintPokemons.js --network localhost
```
Note down the deployed contract addresses and update your frontend `config.js` file.

### 3. Start Frontend
In a new terminal:
```bash
cd frontend
npm start
```

### 4. Run Tests
```bash
npx hardhat test
```

## Using the Application

1. Connect MetaMask:
   - Add the local network (http://127.0.0.1:8545)
   - Import one of the test accounts provided by Hardhat
   - Ensure you have some test ETH

2. Minting NFTs:
   - Use the owner account to mint new Pokémon cards

3. Marketplace Features:
   - List NFTs for sale
   - Buy listed NFTs
   - Withdraw proceeds

4. Auction Features:
   - Start auctions with starting price
   - Place bids
   - End auctions
   - Withdraw outbid funds

## Development

### Project Structure
```
├── contracts/           # Smart contracts
├── frontend/           # React frontend
├── scripts/            # Deployment scripts
├── test/              # Test files
├── hardhat.config.js  # Hardhat configuration
└── package.json       # Project dependencies
```

### Key Files
- `contracts/PokemonCard.sol`: NFT contract
- `contracts/TradingPlatform.sol`: Marketplace contract
- `contracts/AuctionPlatform.sol`: Auction contract
- `frontend/src/App.js`: Main frontend application
- `scripts/deploy.js`: Contract deployment script

## Testing

Run the test suite:
```bash
npx hardhat test
```

The test suite includes:
- Marketplace functionality
- Auction functionality
- Security tests
- Integration tests

## Security Considerations

- All contracts use OpenZeppelin's security features
- Reentrancy protection implemented
- Access control for critical functions
- Emergency pause functionality
- Anti-sniping measures in auctions

## Troubleshooting

1. MetaMask Connection Issues:
   - Ensure you're on the correct network
   - Check if the RPC URL is correct
   - Verify contract addresses in the frontend
   - Disconnect in the MetaMask wallet and then connect again trough the app

2. Contract Deployment Issues:
   - Check Hardhat network is running
   - Verify gas settings
   - Ensure sufficient test ETH
   - Check the addresses

3. IPFS Issues:
   - Verify IPFS daemon is running
   - Check IPFS gateway accessibility
   - Ensure metadata format is correct


## Contributions
   -This project was completed as a solo effort.
   - All smart contract code, frontend code, and tests were written by Benjamin Werlen.
   - Cursor  was used for code suggestions, debugging, and UI advice, but all final implementation and integration was performed by me.
   - No other students or external contributors were involved.


This project is licensed under the MIT License - see the LICENSE file for details.

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

