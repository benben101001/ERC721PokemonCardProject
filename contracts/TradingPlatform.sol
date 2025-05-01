// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// Import OpenZeppelin contracts for ERC721 interface and reentrancy protection
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IERC721Receiver.sol";

/**
 * @title TradingPlatform
 * @dev A marketplace contract for trading Pokémon card NFTs
 * Implements a secure marketplace with listing, buying, and withdrawal functionality
 * Uses ReentrancyGuard to prevent reentrancy attacks
 */
contract TradingPlatform is ReentrancyGuard, IERC721Receiver {
    /**
     * @dev Structure to store information about a listed Pokémon card
     * @param seller Address of the card owner who listed it
     * @param nftContract Address of the PokemonCard contract
     * @param tokenId ID of the Pokémon card
     * @param price Price in wei for the card
     */
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
    }

    // Mapping of listing IDs to Listing structs
    mapping(uint256 => Listing) public listings;
    // Counter for generating unique listing IDs
    uint256 private listingCounter;
    // Mapping to track pending withdrawals for sellers
    mapping(address => uint256) public pendingWithdrawals;

    /**
     * @dev Returns the total number of listings
     */
    function getListingCount() external view returns (uint256) {
        return listingCounter;
    }
    

    /**
     * @dev Implementation of the ERC721Receiver interface
     * Required to receive NFTs when they are listed
     */
    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    /**
     * @dev Lists a Pokémon card for sale on the marketplace
     * @param nftContract Address of the PokemonCard contract
     * @param tokenId ID of the Pokémon card to list
     * @param price Price in wei for the card
     * @notice Transfers the NFT to the marketplace contract
     */
    function listCard(address nftContract, uint256 tokenId, uint256 price) external {
        // Transfer the NFT from the seller to the marketplace
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        // Create a new listing
        listings[listingCounter] = Listing(msg.sender, nftContract, tokenId, price);
        listingCounter++;
    }

    /**
     * @dev Buys a listed Pokémon card
     * @param listingId ID of the listing to purchase
     * @notice Requires exact payment amount
     * @notice Uses nonReentrant modifier to prevent reentrancy attacks
     */
    function buyCard(uint256 listingId) external payable nonReentrant {
        Listing memory listing = listings[listingId];
        require(msg.value >= listing.price, "Insufficient payment");

        // Store the payment in pendingWithdrawals for the seller
        pendingWithdrawals[listing.seller] += msg.value;

        // Transfer the NFT to the buyer
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, listing.tokenId);

        // Remove the listing from the marketplace
        delete listings[listingId];
    }

    /**
     * @dev Allows sellers to withdraw their earnings
     * @notice Uses nonReentrant modifier to prevent reentrancy attacks
     */
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");

        // Reset the pending withdrawals before transferring to prevent reentrancy
        pendingWithdrawals[msg.sender] = 0;

        // Transfer the funds to the seller
        payable(msg.sender).transfer(amount);
    }
}
