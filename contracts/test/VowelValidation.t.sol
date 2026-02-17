// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/SpellBlockGame.sol";
import "../src/SpellEngine.sol";
import "../src/SpellRegistry.sol";
import "../src/DictionaryVerifier.sol";
import "./mocks/MockERC20.sol";

/**
 * @title VowelValidation Test
 * @notice Reproduces the bug where round 10 was opened with zero vowels (PYNSLFTR)
 * @dev This test should FAIL until the bug is fixed
 */
contract VowelValidationTest is Test {
    SpellBlockGame public game;
    SpellEngine public spellEngine;
    DictionaryVerifier public dictVerifier;
    SpellRegistry public spellRegistry;
    MockERC20 public token;
    
    address public operator = address(0x1);
    address public owner = address(0x2);
    address public player = address(0x3);
    
    function setUp() public {
        // Deploy token
        token = new MockERC20("CLAWDIA", "CLAW", 18);
        
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
    }
    
    /**
     * @notice Test that openRound() rejects letter pools with zero vowels
     * @dev This test reproduces the Round 10 bug where PYNSLFTR (zero vowels) was accepted
     */
    function testRevertOpenRoundWithZeroVowels() public {
        vm.startPrank(operator);
        
        bytes32 seedHash = keccak256("test seed");
        bytes32 rulerCommitHash = keccak256("ruler commit");
        
        // Round 10 actual data: PYNSLFTR (zero vowels)
        bytes8 noVowels = bytes8(hex"50594e534c465452"); // P Y N S L F T R
        
        // This should revert because there are no vowels
        vm.expectRevert("Letter pool must contain at least 2 vowels");
        game.openRound(seedHash, rulerCommitHash, noVowels);
        
        vm.stopPrank();
    }
    
    /**
     * @notice Test that openRound() rejects letter pools with only 1 vowel
     */
    function testRevertOpenRoundWithOneVowel() public {
        vm.startPrank(operator);
        
        bytes32 seedHash = keccak256("test seed");
        bytes32 rulerCommitHash = keccak256("ruler commit");
        
        // PYNSLFTA = P Y N S L F T A (only 1 vowel: A)
        bytes8 oneVowel = bytes8(hex"50594e534c465441");
        
        // This should revert because there's only 1 vowel
        vm.expectRevert("Letter pool must contain at least 2 vowels");
        game.openRound(seedHash, rulerCommitHash, oneVowel);
        
        vm.stopPrank();
    }
    
    /**
     * @notice Test that openRound() accepts letter pools with 2+ vowels
     */
    function testAcceptOpenRoundWithTwoVowels() public {
        vm.startPrank(operator);
        
        bytes32 seedHash = keccak256("test seed");
        bytes32 rulerCommitHash = keccak256("ruler commit");
        
        // PYNSLFAE = P Y N S L F A E (2 vowels: A, E)
        bytes8 twoVowels = bytes8(hex"50594e534c464145");
        
        // This should succeed
        game.openRound(seedHash, rulerCommitHash, twoVowels);
        
        // Verify round was created
        (
            uint256 roundId,
            ,
            ,
            ,
            bytes8 letterPool,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
        ) = game.rounds(1);
        
        assertEq(roundId, 1);
        assertEq(letterPool, twoVowels);
        
        vm.stopPrank();
    }
    
    /**
     * @notice Test edge case: exactly 2 vowels (minimum required)
     */
    function testAcceptOpenRoundWithExactlyTwoVowels() public {
        vm.startPrank(operator);
        
        bytes32 seedHash = keccak256("test seed");
        bytes32 rulerCommitHash = keccak256("ruler commit");
        
        // BCDFLNAO = B C D F L N A O (exactly 2 vowels: A, O)
        bytes8 exactlyTwo = bytes8(hex"4243444c464e414f");
        
        game.openRound(seedHash, rulerCommitHash, exactlyTwo);
        
        // Verify it worked
        assertEq(game.currentRoundId(), 1);
        
        vm.stopPrank();
    }
    
    /**
     * @notice Test that Y is treated as a consonant (not a vowel)
     */
    function testYTreatedAsConsonant() public {
        vm.startPrank(operator);
        
        bytes32 seedHash = keccak256("test seed");
        bytes32 rulerCommitHash = keccak256("ruler commit");
        
        // BCDFLYNT = B C D F L Y N T (Y is NOT counted as a vowel, 0 vowels)
        bytes8 withY = bytes8(hex"4243444c46594e54");
        
        // Should revert because Y doesn't count as a vowel
        vm.expectRevert("Letter pool must contain at least 2 vowels");
        game.openRound(seedHash, rulerCommitHash, withY);
        
        vm.stopPrank();
    }
}
