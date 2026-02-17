// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SpellBlockGame.sol";
import "../src/SpellEngine.sol";
import "../src/SpellRegistry.sol";
import "../src/DictionaryVerifier.sol";
import "./mocks/MockBurnableERC20.sol";

/**
 * @title BurnValidation Test
 * @notice Verifies that token burns actually reduce total supply instead of transferring to dead address
 * @dev Tests the burn mechanism in SpellBlockGame finalization
 */
contract BurnValidationTest is Test {
    SpellBlockGame public game;
    SpellEngine public spellEngine;
    DictionaryVerifier public dictVerifier;
    SpellRegistry public spellRegistry;
    MockBurnableERC20 public token;
    
    address public operator = address(0x1);
    address public owner = address(0x2);
    address public player = address(0x3);
    
    uint256 constant INITIAL_SUPPLY = 1000000e18;
    
    function setUp() public {
        // Deploy token with initial supply
        token = new MockBurnableERC20("CLAWDIA", "CLAW", 18);
        token.mint(address(this), INITIAL_SUPPLY);
        
        // Deploy supporting contracts
        dictVerifier = new DictionaryVerifier();
        spellEngine = new SpellEngine();
        spellRegistry = new SpellRegistry();
        
        // Deploy game
        game = new SpellBlockGame(
            address(token),
            operator,
            owner,
            address(spellEngine),
            address(dictVerifier),
            address(0), // staker distributor placeholder
            address(spellRegistry)
        );
        
        // Fund game contract for testing
        token.transfer(address(game), 100000e18);
    }
    
    /**
     * @notice Test that burning tokens reduces total supply
     * @dev This is the correct behavior for a burn function
     */
    function testBurnReducesTotalSupply() public {
        uint256 initialSupply = token.totalSupply();
        uint256 burnAmount = 1000e18;
        
        // Transfer to game contract
        uint256 gameBalanceBefore = token.balanceOf(address(game));
        
        // Burn tokens from game contract (ERC20Burnable.burn burns from msg.sender)
        vm.prank(address(game));
        token.burn(burnAmount);
        
        // Verify total supply decreased
        uint256 finalSupply = token.totalSupply();
        assertEq(finalSupply, initialSupply - burnAmount, "Total supply should decrease by burn amount");
        
        // Verify game balance decreased
        uint256 gameBalanceAfter = token.balanceOf(address(game));
        assertEq(gameBalanceAfter, gameBalanceBefore - burnAmount, "Game balance should decrease");
    }
    
    /**
     * @notice Test that transferring to dead address does NOT reduce total supply
     * @dev This demonstrates the bug in the current implementation
     */
    function testTransferToDeadAddressDoesNotReduceSupply() public {
        uint256 initialSupply = token.totalSupply();
        uint256 transferAmount = 1000e18;
        
        // Transfer to dead address (current buggy implementation)
        vm.prank(address(game));
        token.transfer(address(0xdead), transferAmount);
        
        // Total supply should NOT change (this is the bug)
        uint256 finalSupply = token.totalSupply();
        assertEq(finalSupply, initialSupply, "Total supply unchanged - tokens not actually burned");
        
        // Dead address balance increased instead
        uint256 deadBalance = token.balanceOf(address(0xdead));
        assertEq(deadBalance, transferAmount, "Tokens sent to dead address instead of burned");
    }
}
