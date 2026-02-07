// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ISpellEngine} from "./interfaces/ISpellEngine.sol";

/// @title SpellEngine
/// @notice Validates words against the exactly 4 SpellBlock spells per v3 spec
/// @dev Implements: Veto (0), Anchor (1), Seal (2), Gem (3) - no other spells exist
contract SpellEngine is ISpellEngine {

    // ═══════════════════════════════════════════════════════════════════════════
    //  SPELL CONSTANTS - Exactly 4 spells, no more, no fewer
    // ═══════════════════════════════════════════════════════════════════════════
    
    uint8 public constant VETO = 0;    // Word must NOT contain vetoLetter
    uint8 public constant ANCHOR = 1;  // Word must START with anchorLetter  
    uint8 public constant SEAL = 2;    // Word must END with sealLetter
    uint8 public constant GEM = 3;     // Word must have adjacent identical letters

    address public owner;

    constructor() {
        owner = msg.sender;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  MAIN VALIDATION - Canonical Spell Implementation
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Validate word against the revealed spell
    /// @param spellId Must be 0-3 (Veto/Anchor/Seal/Gem)
    /// @param spellParam Letter parameter for Veto/Anchor/Seal (unused for Gem)
    /// @param word The word to validate (normalized uppercase ASCII)
    /// @return passes True if word passes the spell, false if it fails
    function validate(
        uint8 spellId,
        bytes32 spellParam,
        string calldata word,
        bytes32[] calldata /* categoryProof - unused in v3 */
    ) external pure override returns (bool passes) {
        
        if (spellId == VETO) {
            return _validateVeto(word, spellParam);
        }
        
        if (spellId == ANCHOR) {
            return _validateAnchor(word, spellParam);
        }
        
        if (spellId == SEAL) {
            return _validateSeal(word, spellParam);
        }
        
        if (spellId == GEM) {
            return _validateGem(word);
        }

        // Invalid spellId - only 0-3 exist
        revert("Invalid spellId");
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  SPELL IMPLEMENTATIONS - Per Spec
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Veto (spellId=0): Word must NOT contain the vetoed letter anywhere
    /// @param word The word to check
    /// @param spellParam bytes32 containing the vetoed letter (first byte)
    /// @return True if word does NOT contain the vetoed letter
    function _validateVeto(string calldata word, bytes32 spellParam) internal pure returns (bool) {
        bytes1 vetoLetter = bytes1(spellParam);
        return !_containsLetter(word, vetoLetter);
    }

    /// @notice Anchor (spellId=1): Word must START with the anchor letter
    /// @param word The word to check
    /// @param spellParam bytes32 containing the anchor letter (first byte)
    /// @return True if word starts with the anchor letter
    function _validateAnchor(string calldata word, bytes32 spellParam) internal pure returns (bool) {
        bytes1 anchorLetter = bytes1(spellParam);
        bytes memory w = bytes(word);
        
        if (w.length == 0) return false;
        
        return _normalizeCase(w[0]) == _normalizeCase(anchorLetter);
    }

    /// @notice Seal (spellId=2): Word must END with the seal letter
    /// @dev ⚠️ CRITICAL: This checks ONLY the last letter, not "contains anywhere"
    /// @param word The word to check
    /// @param spellParam bytes32 containing the seal letter (first byte)
    /// @return True if word ends with the seal letter
    function _validateSeal(string calldata word, bytes32 spellParam) internal pure returns (bool) {
        bytes1 sealLetter = bytes1(spellParam);
        bytes memory w = bytes(word);
        
        if (w.length == 0) return false;
        
        return _normalizeCase(w[w.length - 1]) == _normalizeCase(sealLetter);
    }

    /// @notice Gem (spellId=3): Word must have at least one geminate (adjacent identical letters)
    /// @param word The word to check
    /// @return True if word contains adjacent identical letters
    function _validateGem(string calldata word) internal pure returns (bool) {
        bytes memory w = bytes(word);
        
        if (w.length < 2) return false;

        for (uint i = 0; i < w.length - 1; i++) {
            if (_normalizeCase(w[i]) == _normalizeCase(w[i + 1])) {
                return true;
            }
        }
        
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Check if word contains a specific letter anywhere
    /// @param word The word to check
    /// @param letter The letter to find
    /// @return True if letter appears anywhere in word
    function _containsLetter(string calldata word, bytes1 letter) internal pure returns (bool) {
        bytes memory w = bytes(word);
        bytes1 normalizedLetter = _normalizeCase(letter);

        for (uint i = 0; i < w.length; i++) {
            if (_normalizeCase(w[i]) == normalizedLetter) {
                return true;
            }
        }
        
        return false;
    }

    /// @notice Normalize a letter to lowercase for case-insensitive comparison
    /// @param letter The letter to normalize
    /// @return Lowercase version of the letter
    function _normalizeCase(bytes1 letter) internal pure returns (bytes1) {
        if (letter >= 0x41 && letter <= 0x5A) {  // A-Z
            return bytes1(uint8(letter) + 32);     // Convert to lowercase
        }
        return letter;  // Already lowercase or not a letter
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  VALIDATION HELPERS FOR TESTING
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Check a specific spell for testing/debugging
    function checkVeto(string calldata word, bytes1 vetoLetter) external pure returns (bool) {
        return _validateVeto(word, bytes32(abi.encodePacked(vetoLetter)));
    }

    /// @notice Check a specific spell for testing/debugging
    function checkAnchor(string calldata word, bytes1 anchorLetter) external pure returns (bool) {
        return _validateAnchor(word, bytes32(abi.encodePacked(anchorLetter)));
    }

    /// @notice Check a specific spell for testing/debugging
    function checkSeal(string calldata word, bytes1 sealLetter) external pure returns (bool) {
        return _validateSeal(word, bytes32(abi.encodePacked(sealLetter)));
    }

    /// @notice Check a specific spell for testing/debugging
    function checkGem(string calldata word) external pure returns (bool) {
        return _validateGem(word);
    }
}