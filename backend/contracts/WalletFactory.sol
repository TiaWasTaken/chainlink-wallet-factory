// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./SmartWallet.sol";

contract WalletFactory {
    mapping(address => address[]) public walletsOf;
    event WalletCreated(address indexed owner, address wallet);

    function createWallet() external returns (address wallet) {
        wallet = address(new SmartWallet(msg.sender));
        walletsOf[msg.sender].push(wallet);
        emit WalletCreated(msg.sender, wallet);
    }

    function getWallets(address owner) external view returns (address[] memory) {
        return walletsOf[owner];
    }
}

