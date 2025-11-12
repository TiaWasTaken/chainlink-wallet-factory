// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

// Interfaccia Chainlink
interface AggregatorV3Interface {
    function decimals() external view returns (uint8);
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
}

contract PriceConsumerV3 {
    AggregatorV3Interface public priceFeed;

    // Costruttore vuoto per i test locali — possiamo impostare manualmente il feed
    constructor() {}

    //Funzione per settare il feed (necessaria ai test e ai deploy personalizzati)
    function setPriceFeed(address _feed) public {
        priceFeed = AggregatorV3Interface(_feed);
    }

    //Restituisce il prezzo corrente
    function getLatestPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }

    //Restituisce il numero di decimali
    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }
}

