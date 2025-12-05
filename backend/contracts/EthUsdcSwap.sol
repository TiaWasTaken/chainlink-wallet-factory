// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AggregatorV3Interface.sol";

contract EthUsdcSwap is ReentrancyGuard {
    IERC20 public immutable usdc;
    AggregatorV3Interface public immutable ethUsdFeed;

    // USDC standard: 6 decimali
    uint8 public constant USDC_DECIMALS = 6;

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

        uint8 decimals = ethUsdFeed.decimals(); // es. 8 per la maggior parte dei feed

        // Normalizziamo sempre a 1e8
        if (decimals == 8) {
            return uint256(answer);
        } else if (decimals > 8) {
            return uint256(answer) / 10 ** (decimals - 8);
        } else {
            return uint256(answer) * 10 ** (8 - decimals);
        }
    }

    // --------- BUY: ETH -> USDC ---------
    // msg.value = ETH (18 decimali)
    // 1 USDC = 1 USD
    //
    // recipient: chi riceve i token USDC
    function buyUsdc(address recipient)
        external
        payable
        nonReentrant
        returns (uint256 amountUsdc)
    {
        require(recipient != address(0), "Invalid recipient");
        require(msg.value > 0, "No ETH sent");

        uint256 ethUsd = _getEthUsdPrice(); // 1 ETH in USD, scalato 1e8

        // valore in USD (scalato 1e8):
        // msg.value [wei] * ethUsd [USD * 1e8 / ETH] / 1e18 [wei/ETH]
        uint256 usdValue = (msg.value * ethUsd) / 1e18;

        // USDC ha 6 decimali → amountUsdc in 6 decimali
        // usdValue è in 1e8 → convertiamo: * 1e6 / 1e8 = / 1e2
        amountUsdc = (usdValue * (10 ** USDC_DECIMALS)) / (10 ** 8);

        require(amountUsdc > 0, "USDC amount is zero");
        require(
            usdc.balanceOf(address(this)) >= amountUsdc,
            "Not enough USDC liquidity"
        );

        bool ok = usdc.transfer(recipient, amountUsdc);
        require(ok, "USDC transfer failed");
    }

    // --------- SELL: USDC -> ETH ---------
    // L’utente deve prima fare:
    //    usdc.approve(address(this), amountUsdc)
    //
    // recipient: chi riceve l’ETH
    // amountUsdc: quanti USDC (6 decimali) vendere
    function sellUsdc(address recipient, uint256 amountUsdc)
        external
        nonReentrant
        returns (uint256 amountEth)
    {
        require(recipient != address(0), "Invalid recipient");
        require(amountUsdc > 0, "Zero amount");

        // 1) Sposta USDC dall'utente al contratto
        bool ok = usdc.transferFrom(msg.sender, address(this), amountUsdc);
        require(ok, "USDC transfer failed");

        uint256 ethUsd = _getEthUsdPrice(); // 1 ETH in USD, 1e8

        // 2) amountUsdc (6 decimali) -> USD (1e8)
        //
        // amountUsdc / 1e6 = USD
        // USD * 1e8 = usdValue
        uint256 usdValue = (amountUsdc * (10 ** 8)) / (10 ** USDC_DECIMALS);

        // 3) USD (1e8) -> ETH (1e18)
        //
        // usdValue / 1e8 = USD
        // ETH = USD / (price in USD/ETH)
        // quindi: amountEth = usdValue * 1e18 / ethUsd
        amountEth = (usdValue * 1e18) / ethUsd;

        require(amountEth > 0, "ETH amount is zero");
        require(address(this).balance >= amountEth, "Not enough ETH liquidity");

        (bool sent, ) = payable(recipient).call{value: amountEth}("");
        require(sent, "ETH transfer failed");
    }

    // Permette di inviare ETH al contratto (es. per fornire liquidità)
    receive() external payable {}
}

