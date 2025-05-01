# Pokemon NFT Marketplace

A decentralized marketplace for trading Pokemon NFT cards, built with Solidity, Hardhat, and React.

## Features

- Mint unique Pokemon NFT cards with IPFS-hosted metadata
- List cards for sale in the marketplace
- Buy and sell Pokemon cards with secure transactions
- View card details and ownership history
- Secure and transparent transactions with reentrancy protection

## Prerequisites

- Node.js (v16 or later)
- npm or yarn
- MetaMask wallet
- Local Hardhat network or Sepolia testnet ETH (for testing)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd NFT_Pokemon_Project
```

2. Install dependencies:
```bash
npm install
```

## Smart Contracts

The project consists of two main smart contracts:

1. `PokemonCard.sol`: An ERC721 NFT contract for minting and managing Pokemon cards
   - Implements ERC721URIStorage for IPFS metadata
   - Only owner can mint new cards
   - Tracks total supply and ownership

2. `TradingPlatform.sol`: A marketplace contract for trading Pokemon cards
   - Implements secure listing and buying functionality
   - Uses ReentrancyGuard for security
   - Handles payments and withdrawals
   - Manages listings and ownership transfers

## Deployment

1. Start the local Hardhat node:
```bash
npx hardhat node
```

2. In a new terminal, deploy contracts and mint Pokemon cards:
```bash
npx hardhat run scripts/deployAndMintPokemons.js --network localhost
```

This will:
- Deploy the PokemonCard contract
- Deploy the TradingPlatform contract
- Mint 100 Pokemon cards with IPFS-hosted metadata
- List all cards on the marketplace for 0.1 ETH each

## Project Structure

```
NFT_Pokemon_Project/
├── contracts/              # Smart contracts
│   ├── PokemonCard.sol    # NFT contract
│   ├── TradingPlatform.sol # Marketplace contract
│   └── IERC721Receiver.sol # Interface for NFT transfers
├── scripts/               # Deployment scripts
│   └── deployAndMintPokemons.js # Deployment and minting script
├── mint_metadata/         # Pokemon metadata
│   └── pokemon_cid_mapping.json # IPFS CIDs for Pokemon metadata
└── test/                 # Smart contract tests
```

## Smart Contract Functions

### PokemonCard.sol
- `mintCard(address recipient, string tokenURI)`: Mints a new Pokemon card
- `totalSupply()`: Returns total number of minted cards
- `ownerOfToken(uint256 tokenId)`: Returns owner of a specific card

### TradingPlatform.sol
- `listCard(address nftContract, uint256 tokenId, uint256 price)`: Lists a card for sale
- `buyCard(uint256 listingId)`: Buys a listed card
- `withdraw()`: Withdraws earnings from sales

## Security Features

- Reentrancy protection on all state-changing functions
- Secure payment handling with pending withdrawals
- Proper access control for minting
- Safe NFT transfers with ERC721Receiver implementation

## License

This project is licensed under the MIT License - see the LICENSE file for details.

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```

