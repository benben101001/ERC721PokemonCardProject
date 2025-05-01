// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AuctionPlatform is ReentrancyGuard, Ownable {
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
        uint256 endTime
    );

    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount);
    event Withdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);

    function startAuction(
        address nftContract,
        uint256 tokenId,
        uint256 durationInSeconds
    ) external {

        
        IERC721(nftContract).transferFrom(msg.sender, address(this), tokenId);

        uint256 auctionId = auctionCounter++;
        Auction storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.nftContract = nftContract;
        a.tokenId = tokenId;
        a.endTime = block.timestamp + durationInSeconds;

        emit AuctionStarted(auctionId, msg.sender, nftContract, tokenId, a.endTime);
    }

    function bid(uint256 auctionId) external payable {
        Auction storage a = auctions[auctionId];
        require(block.timestamp < a.endTime, "Auction ended");
        require(msg.value > a.highestBid, "Bid too low");

        if (a.highestBid > 0 && a.highestBidder != address(0)) {
            a.bids[a.highestBidder] += a.highestBid;
            allBidders[auctionId].push(a.highestBidder);
        }

        a.highestBid = msg.value;
        a.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, msg.value);
    }

    function withdraw(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        uint256 amount = a.bids[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        a.bids[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdraw failed");

        emit Withdrawn(auctionId, msg.sender, amount);
    }

    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage a = auctions[auctionId];
        require(block.timestamp >= a.endTime, "Auction not yet ended");
        require(!a.ended, "Auction already ended");

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
            bool ended
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
            a.ended
        );
    }

    function getPendingWithdrawal(uint256 auctionId, address bidder) external view returns (uint256) {
        return auctions[auctionId].bids[bidder];
    }
}
