// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./SmartWallet.sol";

contract WalletFactory {
    // owner => lista dei suoi wallet
    mapping(address => address[]) public userWallets;

    event WalletCreated(address indexed owner, address wallet);

    /// Crea un nuovo SmartWallet e lo associa a msg.sender
    function createWallet() external {
        SmartWallet wallet = new SmartWallet(msg.sender);
        userWallets[msg.sender].push(address(wallet));
        emit WalletCreated(msg.sender, address(wallet));
    }

    /// Getter “esplicito”
    function getUserWallets(address user) external view returns (address[] memory) {
        return userWallets[user];
    }

    /// Alias per compatibilità con i test esistenti
    function getWallets(address user) external view returns (address[] memory) {
        return userWallets[user];
    }
}

