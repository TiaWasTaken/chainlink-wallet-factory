// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDCMock is ERC20 {
    uint8 private constant _DECIMALS = 6;

    constructor() ERC20("USD Coin Mock", "USDC") {
        // Qualche milione al deployer, giusto per testare transfer manuali
        _mint(msg.sender, 10_000_000 * 10**_DECIMALS);
    }

    /// @notice funzione di mint aperta (solo per ambiente di sviluppo)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view virtual override returns (uint8) {
        return _DECIMALS;
    }
}

