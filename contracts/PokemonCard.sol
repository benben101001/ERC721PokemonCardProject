// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import OpenZeppelin contracts for ERC721 NFT standard and ownership management
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PokemonCard
 * @dev This contract implements an ERC721 NFT for Pokémon cards
 * It inherits from ERC721URIStorage for NFT functionality with URI storage
 * and Ownable for access control
 */
contract PokemonCard is ERC721URIStorage, Ownable {
    // Counter for token IDs, starting from 1
    uint256 private _tokenIds;
    
    /**
     * @dev Constructor initializes the contract with name "PokemonCard" and symbol "PKC"
     * Sets the deployer as the initial owner
     */
    constructor() ERC721("PokemonCard", "PKC") Ownable(msg.sender) {}

    /**
     * @dev Mints a new Pokémon card NFT
     * @param recipient Address that will receive the newly minted NFT
     * @param tokenURI IPFS URI containing the metadata for the Pokémon card
     * @return The ID of the newly minted token
     * @notice Only the contract owner can mint new cards
     */
    function mintCard(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        _tokenIds++;
        _safeMint(recipient, _tokenIds);
        _setTokenURI(_tokenIds, tokenURI);
        return _tokenIds;
    }

    /**
     * @dev Returns the total number of Pokémon cards minted
     * @return The total supply of tokens
     */
    function totalSupply() public view returns (uint256) {
    return _tokenIds;
}

    /**
     * @dev Returns the owner of a specific Pokémon card
     * @param tokenId The ID of the token to check
     * @return The address of the token owner
     */
function ownerOfToken(uint256 tokenId) public view returns (address) {
    return ownerOf(tokenId);
}
}
