// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract AuctionPlatform is ReentrancyGuard, Pausable, Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {
        
    }

    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        uint256 endTime;
        uint256 highestBid;
        address highestBidder;
        bool ended;
        uint256 startingAmount;
        bool needsExtension;
        uint256 lastBidTime;
        mapping(address => uint256) bids;
    }

    uint256 public auctionCounter;
    mapping(uint256 => Auction) private auctions;
    mapping(uint256 => address[]) public allBidders;

    event AuctionStarted(
        uint256 indexed auctionId,
        address indexed seller,
        address nftContract,
        uint256 tokenId,
        uint256 endTime,
        uint256 startingAmount
    );

    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);
    event Withdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event ExtensionNeeded(uint256 indexed auctionId, uint256 currentEndTime);
    event AuctionExtended(uint256 indexed auctionId, uint256 newEndTime);

    function startAuction(
        address nftContract,
        uint256 tokenId,
        uint256 durationInSeconds,
        uint256 startingAmount
    ) external whenNotPaused {
        require(durationInSeconds > 0, "Duration must be greater than 0");
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 auctionId = auctionCounter++;
        Auction storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.nftContract = nftContract;
        a.tokenId = tokenId;
        a.endTime = block.timestamp + durationInSeconds;
        a.startingAmount = startingAmount;

        emit AuctionStarted(auctionId, msg.sender, nftContract, tokenId, a.endTime, startingAmount);
    }

    function bid(uint256 auctionId) external payable nonReentrant whenNotPaused {
        Auction storage auction = auctions[auctionId];
        require(!auction.ended, "Auction already ended");
        require(block.timestamp < auction.endTime, "Auction already ended");
        require(msg.value > auction.highestBid, "Bid not high enough");
        require(msg.value >= auction.startingAmount, "Bid below starting amount");

        if (auction.highestBid > 0) {
            allBidders[auctionId].push(auction.highestBidder);
            auction.bids[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        // Automatically extend the auction if bid is placed in last 2 minutes
        if (auction.endTime - block.timestamp <= 2 minutes) {
            auction.endTime = block.timestamp + 2 minutes;
        }

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    function withdraw(uint256 auctionId) external nonReentrant whenNotPaused {
        Auction storage a = auctions[auctionId];
        uint256 amount = a.bids[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        a.bids[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdrawn(auctionId, msg.sender, amount);
    }

    function endAuction(uint256 auctionId) external nonReentrant whenNotPaused {
        Auction storage a = auctions[auctionId];
        require(block.timestamp >= a.endTime, "Auction not yet ended");
        require(!a.ended, "Auction already ended");
        require(msg.sender == owner() || msg.sender == a.seller, "Only owner or seller can end auction");

        a.ended = true;

        if (a.highestBidder != address(0)) {
            IERC721(a.nftContract).transferFrom(address(this), a.highestBidder, a.tokenId);
            (bool success, ) = payable(a.seller).call{value: a.highestBid}("");
            require(success, "Payout failed");
        } else {
            IERC721(a.nftContract).transferFrom(address(this), a.seller, a.tokenId);
        }

        emit AuctionEnded(auctionId, a.highestBidder, a.highestBid);
    }

    function getAuction(uint256 auctionId)
        external
        view
        returns (
            address seller,
            address nftContract,
            uint256 tokenId,
            uint256 endTime,
            uint256 highestBid,
            address highestBidder,
            bool ended,
            uint256 startingAmount
        )
    {
        Auction storage a = auctions[auctionId];
        return (
            a.seller,
            a.nftContract,
            a.tokenId,
            a.endTime,
            a.highestBid,
            a.highestBidder,
            a.ended,
            a.startingAmount
        );
    }

    function getPendingWithdrawal(uint256 auctionId, address bidder) external view returns (uint256) {
        return auctions[auctionId].bids[bidder];
    }

    // Emergency stop (pause/unpause)
    function pause() external onlyOwner {
        _pause();
    }
    function unpause() external onlyOwner {
        _unpause();
    }
}
