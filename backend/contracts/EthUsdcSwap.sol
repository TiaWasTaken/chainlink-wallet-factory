// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AggregatorV3Interface.sol";

contract EthUsdcSwap is ReentrancyGuard {
    IERC20 public immutable usdc;
    AggregatorV3Interface public immutable ethUsdFeed;

    uint8 public constant USDC_DECIMALS = 6;

    event BoughtUSDC(address indexed payer, address indexed recipient, uint256 ethIn, uint256 usdcOut);
    event SoldUSDC(address indexed seller, address indexed recipient, uint256 usdcIn, uint256 ethOut);

    constructor(address _usdc, address _ethUsdFeed) {
        require(_usdc != address(0), "USDC address is zero");
        require(_ethUsdFeed != address(0), "Feed address is zero");

        usdc = IERC20(_usdc);
        ethUsdFeed = AggregatorV3Interface(_ethUsdFeed);
    }

    // --------- INTERNAL: prezzo ETH/USD normalizzato a 1e8 ---------
    function _getEthUsdPrice() internal view returns (uint256) {
        (, int256 answer,,,) = ethUsdFeed.latestRoundData();
        require(answer > 0, "Invalid price");

        uint8 dec = ethUsdFeed.decimals();

        if (dec == 8) return uint256(answer);
        if (dec > 8) return uint256(answer) / (10 ** (dec - 8));
        return uint256(answer) * (10 ** (8 - dec));
    }

    /// ✅ View: prezzo ETH/USD normalizzato a 1e8 (per grafico)
    function getEthUsdPrice1e8() external view returns (uint256) {
        return _getEthUsdPrice();
    }

    /// ✅ View: quote ETH->USDC (senza spostare fondi)
    function quoteBuyUsdc(uint256 ethAmountWei) public view returns (uint256 amountUsdc) {
        require(ethAmountWei > 0, "Zero ETH");
        uint256 ethUsd = _getEthUsdPrice();               // 1 ETH in USD, 1e8
        uint256 usdValue = (ethAmountWei * ethUsd) / 1e18; // USD, 1e8
        amountUsdc = (usdValue * (10 ** USDC_DECIMALS)) / (10 ** 8);
    }

    /// ✅ View: quote USDC->ETH (senza spostare fondi)
    function quoteSellUsdc(uint256 amountUsdc) public view returns (uint256 amountEth) {
        require(amountUsdc > 0, "Zero USDC");
        uint256 ethUsd = _getEthUsdPrice(); // 1e8

        uint256 usdValue = (amountUsdc * (10 ** 8)) / (10 ** USDC_DECIMALS); // USD, 1e8
        amountEth = (usdValue * 1e18) / ethUsd; // ETH, 1e18
    }

    // --------- BUY: ETH -> USDC ---------
    function buyUsdc(address recipient)
        external
        payable
        nonReentrant
        returns (uint256 amountUsdc)
    {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value > 0, "No ETH sent");

        amountUsdc = quoteBuyUsdc(msg.value);

        require(amountUsdc > 0, "USDC amount is zero");
        require(usdc.balanceOf(address(this)) >= amountUsdc, "Not enough USDC liquidity");

        bool ok = usdc.transfer(recipient, amountUsdc);
        require(ok, "USDC transfer failed");

        emit BoughtUSDC(msg.sender, recipient, msg.value, amountUsdc);
    }

    // --------- SELL: USDC -> ETH ---------
    function sellUsdc(address recipient, uint256 amountUsdc)
        external
        nonReentrant
        returns (uint256 amountEth)
    {
        require(recipient != address(0), "Invalid recipient");
        require(amountUsdc > 0, "Zero amount");

        bool ok = usdc.transferFrom(msg.sender, address(this), amountUsdc);
        require(ok, "USDC transfer failed");

        amountEth = quoteSellUsdc(amountUsdc);

        require(amountEth > 0, "ETH amount is zero");
        require(address(this).balance >= amountEth, "Not enough ETH liquidity");

        (bool sent, ) = payable(recipient).call{value: amountEth}("");
        require(sent, "ETH transfer failed");

        emit SoldUSDC(msg.sender, recipient, amountUsdc, amountEth);
    }

    receive() external payable {}
}

