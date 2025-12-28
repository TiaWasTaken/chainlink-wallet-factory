// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockV3Aggregator {
    uint8 private _decimals;
    int256 private _latestAnswer;

    constructor(uint8 decimals_, int256 initialAnswer_) {
        _decimals = decimals_;
        _latestAnswer = initialAnswer_;
    }

    function updateAnswer(int256 answer_) external {
        _latestAnswer = answer_;
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (0, _latestAnswer, 0, block.timestamp, 0);
    }
}

