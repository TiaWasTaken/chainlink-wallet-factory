// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IEthUsdcSwap {
    function buyUsdc(address recipient) external payable returns (uint256 amountUsdc);
    function sellUsdc(address recipient, uint256 amountUsdc) external returns (uint256 amountEth);

    // quote helpers (nuovi)
    function quoteBuyUsdc(uint256 ethAmountWei) external view returns (uint256 amountUsdc);
    function quoteSellUsdc(uint256 amountUsdc) external view returns (uint256 amountEth);
}

contract SmartWallet is Ownable, ReentrancyGuard {
    address public factory;

    IERC20 public usdc;
    IEthUsdcSwap public swap;

    event Received(address indexed sender, uint256 amount);
    event Sent(address indexed recipient, uint256 amount);
    event TokenSent(address indexed token, address indexed to, uint256 amount);

    event SwapEthToUsdc(address indexed wallet, uint256 ethIn, uint256 usdcOut);
    event SwapUsdcToEth(address indexed wallet, uint256 usdcIn, uint256 ethOut);

    constructor(address _owner, address _swap, address _usdc) Ownable(_owner) {
        require(_swap != address(0), "swap zero");
        require(_usdc != address(0), "usdc zero");

        factory = msg.sender;
        swap = IEthUsdcSwap(_swap);
        usdc = IERC20(_usdc);
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    function sendETH(address payable recipient, uint256 amount) external onlyOwner nonReentrant {
        require(address(this).balance >= amount, "Saldo insufficiente");
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Trasferimento ETH fallito");
        emit Sent(recipient, amount);
    }

    function sendToken(address token, address to, uint256 amount) external onlyOwner nonReentrant {
        require(token != address(0) && to != address(0), "address zero");
        bool ok = IERC20(token).transfer(to, amount);
        require(ok, "Token transfer failed");
        emit TokenSent(token, to, amount);
    }

    /// ✅ ETH -> USDC con slippage protection
    /// minUsdcOut è in 6 decimali
    function swapEthToUsdc(uint256 ethAmountWei, uint256 minUsdcOut)
        external
        onlyOwner
        nonReentrant
        returns (uint256 usdcOut)
    {
        require(ethAmountWei > 0, "Zero amount");
        require(address(this).balance >= ethAmountWei, "ETH insufficiente");

        // quote on-chain
        uint256 quoted = swap.quoteBuyUsdc(ethAmountWei);
        require(quoted >= minUsdcOut, "Slippage: minUsdcOut");

        usdcOut = swap.buyUsdc{value: ethAmountWei}(address(this));
        require(usdcOut >= minUsdcOut, "Slippage: out");
        emit SwapEthToUsdc(address(this), ethAmountWei, usdcOut);
    }

    /// ✅ USDC -> ETH con slippage protection
    /// minEthOut è in wei
    function swapUsdcToEth(uint256 usdcAmount, uint256 minEthOut)
        external
        onlyOwner
        nonReentrant
        returns (uint256 ethOut)
    {
        require(usdcAmount > 0, "Zero amount");
        require(usdc.balanceOf(address(this)) >= usdcAmount, "USDC insufficiente");

        uint256 quoted = swap.quoteSellUsdc(usdcAmount);
        require(quoted >= minEthOut, "Slippage: minEthOut");

        bool ok = usdc.approve(address(swap), usdcAmount);
        require(ok, "Approve failed");

        ethOut = swap.sellUsdc(address(this), usdcAmount);
        require(ethOut >= minEthOut, "Slippage: out");
        emit SwapUsdcToEth(address(this), usdcAmount, ethOut);
    }
}

