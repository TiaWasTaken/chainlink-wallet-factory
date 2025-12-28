// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SmartWallet.sol";

contract WalletFactory {
    mapping(address => address[]) public userWallets;

    address public immutable swap;
    address public immutable usdc;

    event WalletCreated(address indexed owner, address wallet);

    constructor(address _swap, address _usdc) {
        require(_swap != address(0), "swap zero");
        require(_usdc != address(0), "usdc zero");
        swap = _swap;
        usdc = _usdc;
    }

    function createWallet() external {
        SmartWallet wallet = new SmartWallet(msg.sender, swap, usdc);
        userWallets[msg.sender].push(address(wallet));
        emit WalletCreated(msg.sender, address(wallet));
    }

    function getUserWallets(address user) external view returns (address[] memory) {
        return userWallets[user];
    }

    function getWallets(address user) external view returns (address[] memory) {
        return userWallets[user];
    }
}

