
pragma solidity ^0.8.24;

import "./PriceConsumerV3.sol";
import "./MockV3Aggregator.sol";

contract OraclePrice is PriceConsumerV3 {
    constructor(address mockFeed) {

        setPriceFeed(mockFeed);
    }
}

