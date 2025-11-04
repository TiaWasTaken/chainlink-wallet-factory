// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface AggregatorV3Interface {
    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        );

    function decimals() external view returns (uint8);
}

contract PriceConsumerV3 {
    mapping(bytes32 => AggregatorV3Interface) public feeds;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function setFeed(string memory symbol, address feed) external onlyOwner {
        feeds[keccak256(bytes(symbol))] = AggregatorV3Interface(feed);
    }

    function getPrice(string memory symbol)
        external
        view
        returns (int256 price, uint8 decimals)
    {
        AggregatorV3Interface aggr = feeds[keccak256(bytes(symbol))];
        require(address(aggr) != address(0), "Feed not set");
        (, int256 answer,,,) = aggr.latestRoundData();
        decimals = aggr.decimals();
        return (answer, decimals);
    }
}

