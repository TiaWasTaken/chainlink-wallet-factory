// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCMock is ERC20 {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("USD Coin Mock", "USDC") {
        // 1 miliardo di USDC mock, giusto per avere tanta liquidità
        _mint(msg.sender, 1_000_000_000 * 10**_DECIMALS);
    }

    function decimals() public view virtual override returns (uint8) {
        return _DECIMALS;
    }
}

