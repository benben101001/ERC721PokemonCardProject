// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PokemonCard is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;

    constructor() ERC721("PokemonCard", "PKC") {}

    function mintCard(address recipient, string memory tokenURI) public onlyOwner returns (uint256) {
        _tokenIds++;
        _safeMint(recipient, _tokenIds);
        _setTokenURI(_tokenIds, tokenURI);
        return _tokenIds;
    }
}


