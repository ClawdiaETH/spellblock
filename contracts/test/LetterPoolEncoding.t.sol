// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test, console2} from "forge-std/Test.sol";
import {SpellBlockGame} from "../src/SpellBlockGame.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Letter Pool Encoding Test
 * @notice Tests to verify letter pool encoding/decoding works correctly
 * @dev This test suite ensures that bytes8 letter pools are properly handled
 */
contract LetterPoolEncodingTest is Test {
    
    function setUp() public {
        // Basic setup - we don't need full contract deployment for encoding tests
    }
    
    /**
     * Test basic string to bytes8 encoding
     */
    function testBasicEncoding() public {
        // Test case: "ABCDEFGH"
        bytes8 pool = bytes8(bytes("ABCDEFGH"));
        
        // Verify it's not empty
        assertFalse(pool == bytes8(0), "Pool should not be empty");
        
        // Verify we can extract each letter
        assertEq(uint8(pool[0]), 0x41, "First byte should be 'A' (0x41)");
        assertEq(uint8(pool[1]), 0x42, "Second byte should be 'B' (0x42)");
        assertEq(uint8(pool[2]), 0x43, "Third byte should be 'C' (0x43)");
        assertEq(uint8(pool[7]), 0x48, "Eighth byte should be 'H' (0x48)");
    }
    
    /**
     * Test Round 3 announced letter pool
     */
    function testRound3Letters() public {
        // Round 3: "HRMEIBSD"
        bytes8 pool = bytes8(bytes("HRMEIBSD"));
        
        assertEq(pool, hex"48524d4549425344", "Round 3 pool encoding mismatch");
        
        // Verify each letter
        assertEq(uint8(pool[0]), 0x48, "H");
        assertEq(uint8(pool[1]), 0x52, "R");
        assertEq(uint8(pool[2]), 0x4D, "M");
        assertEq(uint8(pool[3]), 0x45, "E");
        assertEq(uint8(pool[4]), 0x49, "I");
        assertEq(uint8(pool[5]), 0x42, "B");
        assertEq(uint8(pool[6]), 0x53, "S");
        assertEq(uint8(pool[7]), 0x44, "D");
    }
    
    /**
     * Test Round 1 letter pool
     */
    function testRound1Letters() public {
        // Round 1: "AEISOTLN"
        bytes8 pool = bytes8(bytes("AEISOTLN"));
        
        assertEq(pool, hex"414549534f544c4e", "Round 1 pool encoding mismatch");
    }
    
    /**
     * Test that empty pools are detectable
     */
    function testEmptyPoolDetection() public {
        bytes8 emptyPool = bytes8(0);
        
        assertTrue(emptyPool == bytes8(0), "Should detect empty pool");
        
        // All bytes should be 0x00
        for (uint i = 0; i < 8; i++) {
            assertEq(uint8(emptyPool[i]), 0x00, "Empty pool byte should be 0x00");
        }
    }
    
    /**
     * Test letter extraction from pool (spell generation simulation)
     */
    function testLetterExtraction() public {
        bytes8 pool = bytes8(bytes("HRMEIBSD"));
        
        // Simulate spell generation: extract letter at each index
        uint8[] memory expectedChars = new uint8[](8);
        expectedChars[0] = 0x48; // H
        expectedChars[1] = 0x52; // R
        expectedChars[2] = 0x4D; // M
        expectedChars[3] = 0x45; // E
        expectedChars[4] = 0x49; // I
        expectedChars[5] = 0x42; // B
        expectedChars[6] = 0x53; // S
        expectedChars[7] = 0x44; // D
        
        for (uint256 i = 0; i < 8; i++) {
            bytes1 extracted = pool[uint256(i)];
            assertEq(uint8(extracted), expectedChars[i], "Extracted letter mismatch");
            
            // Verify it's a valid uppercase letter
            assertTrue(
                uint8(extracted) >= 0x41 && uint8(extracted) <= 0x5A,
                "Should be uppercase A-Z"
            );
        }
    }
    
    /**
     * Test that we can detect invalid characters
     */
    function testInvalidCharacterDetection() public {
        // Create a pool with one invalid character (lowercase 'a' = 0x61)
        bytes8 invalidPool = hex"4141426144454647"; // "AABaDEFG" (one lowercase)
        
        bool hasInvalid = false;
        for (uint i = 0; i < 8; i++) {
            uint8 char = uint8(invalidPool[i]);
            if (char < 0x41 || char > 0x5A) {
                hasInvalid = true;
                break;
            }
        }
        
        assertTrue(hasInvalid, "Should detect invalid character");
    }
    
    /**
     * Test random letter extraction (spell parameter generation)
     */
    function testRandomLetterExtraction() public {
        bytes8 pool = bytes8(bytes("HRMEIBSD"));
        
        // Simulate random seed-based extraction
        uint256 seed = 0x12345678;
        uint256 letterIndex = (seed >> 8) % 8;
        
        bytes1 extractedLetter = pool[letterIndex];
        
        // Verify extracted letter is valid
        assertTrue(uint8(extractedLetter) >= 0x41 && uint8(extractedLetter) <= 0x5A);
        
        // Convert to bytes32 (as done in contract)
        bytes32 spellParam = bytes32(extractedLetter);
        
        // Verify spell param is not empty
        assertFalse(spellParam == bytes32(0), "Spell param should not be empty");
    }
    
    /**
     * Test that empty pool would cause issues in spell generation
     */
    function testEmptyPoolCausesZeroSpellParam() public {
        bytes8 emptyPool = bytes8(0);
        
        // Try to extract letter from empty pool
        uint256 letterIndex = 5; // Any index
        bytes1 extractedLetter = emptyPool[letterIndex];
        
        // This will be 0x00 (empty byte)
        assertEq(uint8(extractedLetter), 0x00, "Empty pool gives zero byte");
        
        // Convert to spell param
        bytes32 spellParam = bytes32(extractedLetter);
        
        // This proves that empty pool causes zero spell param
        // Which would veto the wrong letter!
        assertTrue(spellParam == bytes32(uint256(0)), "Empty pool causes zero spell param");
    }
    
    /**
     * Fuzz test: Verify any 8 valid uppercase letters encode/decode correctly
     */
    function testFuzz_ValidLetterEncoding(uint8[8] memory letterIndices) public {
        // Create 8 random uppercase letters
        bytes memory letters = new bytes(8);
        for (uint i = 0; i < 8; i++) {
            // Map to A-Z range (0x41-0x5A is 26 letters)
            letters[i] = bytes1(uint8(0x41 + (letterIndices[i] % 26)));
        }
        
        // Encode to bytes8
        bytes8 pool = bytes8(letters);
        
        // Verify not empty (unless we got very unlucky with all nulls)
        if (pool != bytes8(0)) {
            // Verify each byte is in valid range
            for (uint i = 0; i < 8; i++) {
                uint8 char = uint8(pool[i]);
                assertTrue(char >= 0x41 && char <= 0x5A, "Should be uppercase A-Z");
            }
        }
    }
}
