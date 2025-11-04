// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract SmartWallet is Ownable {
    address public factory;
    uint256 public constant MOCK_EXCHANGE_RATE = 1000; // 1 ETH = 1000 token (mock)

    event Received(address indexed sender, uint256 amount);
    event Sent(address indexed recipient, uint256 amount);
    event SwapEthForToken(address indexed user, address token, uint256 ethAmount, uint256 tokenAmount);
    event SwapTokenForEth(address indexed user, address token, uint256 tokenAmount, uint256 ethAmount);

    constructor(address _owner) Ownable(_owner) {
        factory = msg.sender;
    }

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    function sendETH(address payable recipient, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Saldo insufficiente");
        (bool ok, ) = recipient.call{value: amount}("");
        require(ok, "Trasferimento ETH fallito");
        emit Sent(recipient, amount);
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // MOCK swap: ETH -> Token (il wallet invia token al proprietario)
    function swapETHForTokens(address token, uint256 ethAmount) external onlyOwner {
        require(token != address(0), "Token non valido");
        require(address(this).balance >= ethAmount, "Saldo ETH insufficiente");

        uint256 tokenAmount = ethAmount * MOCK_EXCHANGE_RATE;
        IERC20(token).transfer(msg.sender, tokenAmount);

        // “bruciamo” l’ETH verso address(0) per simulare il costo
        (bool ok, ) = payable(address(0)).call{value: ethAmount}("");
        require(ok, "Burn ETH mock fallito");

        emit SwapEthForToken(msg.sender, token, ethAmount, tokenAmount);
    }

    // MOCK swap: Token -> ETH (il wallet riceve token e invia ETH all’owner)
    function swapTokensForETH(address token, uint256 tokenAmount) external onlyOwner {
        require(token != address(0), "Token non valido");

        uint256 ethAmount = tokenAmount / MOCK_EXCHANGE_RATE;
        require(address(this).balance >= ethAmount, "ETH insufficiente nel wallet");

        bool received = IERC20(token).transferFrom(msg.sender, address(this), tokenAmount);
        require(received, "Transfer token fallito");

        (bool ok, ) = payable(msg.sender).call{value: ethAmount}("");
        require(ok, "Trasferimento ETH fallito");

        emit SwapTokenForEth(msg.sender, token, tokenAmount, ethAmount);
    }

    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}

