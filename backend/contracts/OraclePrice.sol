// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PriceConsumerV3.sol";
import "./MockV3Aggregator.sol";

contract OraclePrice is PriceConsumerV3 {
    constructor(address mockFeed) {
        // setta il feed del mock (es: ETH/USD con prezzo iniziale)
        setPriceFeed(mockFeed);
    }
}

