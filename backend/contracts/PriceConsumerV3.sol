
pragma solidity ^0.8.7;


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


    constructor() {}


    function setPriceFeed(address _feed) public {
        priceFeed = AggregatorV3Interface(_feed);
    }


    function getLatestPrice() public view returns (int256) {
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return price;
    }


    function getDecimals() public view returns (uint8) {
        return priceFeed.decimals();
    }
}

