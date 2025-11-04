// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SmartWallet {
    address public owner;

    // Evento per tracciare i trasferimenti di ETH
    event EtherSent(address indexed to, uint256 amount);
    event EtherReceived(address indexed from, uint256 amount);

    // Imposta l'owner al deploy
    constructor(address _owner) {
        owner = _owner;
    }

    // Modifier: permette solo all'owner di eseguire certe funzioni
    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    // Funzione per ricevere ETH
    receive() external payable {
        emit EtherReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        emit EtherReceived(msg.sender, msg.value);
    }

    // ✅ Funzione per inviare ETH ad un altro indirizzo
    function sendETH(address payable _to, uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient balance");
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Transfer failed");
        emit EtherSent(_to, _amount);
    }

    // ✅ Funzione per leggere il saldo corrente del wallet
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}

