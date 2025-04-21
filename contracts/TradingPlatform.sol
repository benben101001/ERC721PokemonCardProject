// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract TradingPlatform is ReentrancyGuard {
    struct Listing {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 price;
    }

    mapping(uint256 => Listing) public listings;
    uint256 private listingCounter;

    function listCard(address nftContract, uint256 tokenId, uint256 price) external {
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);
        listings[listingCounter] = Listing(msg.sender, nftContract, tokenId, price);
        listingCounter++;
    }

    function buyCard(uint256 listingId) external payable nonReentrant {
        Listing memory listing = listings[listingId];
        require(msg.value >= listing.price, "Insufficient payment");

        payable(listing.seller).transfer(msg.value);
        IERC721(listing.nftContract).transferFrom(address(this), msg.sender, listing.tokenId);

        delete listings[listingId];
    }
}
