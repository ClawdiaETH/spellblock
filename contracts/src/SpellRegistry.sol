// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SpellRegistry  
/// @notice Manages spell definitions, weighted ruler length selection, and validation
/// @dev Implements Clawdia's Ruler with weighted sampling and safety constraints
contract SpellRegistry {

    // ═══════════════════════════════════════════════════════════════════════════
    //  CONSTANTS
    // ═══════════════════════════════════════════════════════════════════════════

    // Spell IDs - exactly 4 spells, no more
    uint8 public constant SPELL_VETO = 0;
    uint8 public constant SPELL_ANCHOR = 1;
    uint8 public constant SPELL_SEAL = 2;
    uint8 public constant SPELL_GEM = 3;

    // Ruler length bounds
    uint8 public constant RULER_MIN_LENGTH = 4;
    uint8 public constant RULER_MAX_LENGTH = 12;
    uint8 public constant RULER_LENGTH_COUNT = 9; // lengths 4–12

    // ═══════════════════════════════════════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Weighted selection weights for ruler lengths 4–12 (index 0 = length 4)
    /// @dev Default values: [7, 6, 5, 5, 6, 8, 11, 14, 16] per spec
    uint16[9] public rulerWeights;

    /// @notice Sum of all weights (cached for gas efficiency)
    uint16 public totalWeight;

    address public owner;
    
    // ═══════════════════════════════════════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════════════════════════════════════

    event RulerWeightsUpdated(uint16[9] newWeights, uint16 totalWeight);

    // ═══════════════════════════════════════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════

    constructor() {
        owner = msg.sender;
        
        // Initialize default weights per spec
        rulerWeights[0] = 5;   // Length 4
        rulerWeights[1] = 5;   // Length 5
        rulerWeights[2] = 6;   // Length 6
        rulerWeights[3] = 7;   // Length 7
        rulerWeights[4] = 9;   // Length 8
        rulerWeights[5] = 11;  // Length 9
        rulerWeights[6] = 13;  // Length 10
        rulerWeights[7] = 15;  // Length 11
        rulerWeights[8] = 16;  // Length 12
        
        // Calculate total weight
        totalWeight = 5 + 5 + 6 + 7 + 9 + 11 + 13 + 15 + 16; // = 87
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  RULER LENGTH SELECTION - Weighted Sampling
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Deterministically selects 3 ruler lengths via weighted sampling without replacement
    /// @param randomSeed The round's finalRandomness value from ClawdiaRandomness
    /// @return lengths The 3 selected lengths satisfying all safety constraints
    function selectRulerLengths(bytes32 randomSeed) external view returns (uint8[3] memory lengths) {
        uint16[9] memory w = rulerWeights;  // Working copy of weights
        uint16 remaining = totalWeight;
        bool hasBrutal;  // true if we've selected from {11, 12}
        bool hasEasy;    // true if we've selected from {4, 5}

        for (uint pick = 0; pick < 3; pick++) {
            // Derive per-pick randomness deterministically
            uint256 rand = uint256(keccak256(abi.encodePacked(randomSeed, pick)));
            
            // Rejection sampling loop with safety constraints
            bool selected = false;
            uint256 attempts = 0;
            
            while (!selected && attempts < 20) { // Safety: max 20 attempts
                uint16 roll = uint16(rand % remaining);
                uint16 cumulative = 0;
                
                for (uint i = 0; i < 9; i++) {
                    if (w[i] == 0) continue; // Skip already selected
                    
                    cumulative += w[i];
                    if (roll < cumulative) {
                        uint8 selectedLength = uint8(i + RULER_MIN_LENGTH);
                        
                        // Check safety constraints
                        bool rejected = false;
                        if (selectedLength >= 11 && hasBrutal) rejected = true;  // Max one of {11,12}
                        if (selectedLength <= 5 && hasEasy) rejected = true;     // Max one of {4,5}
                        
                        if (!rejected) {
                            // Valid selection
                            lengths[pick] = selectedLength;
                            if (selectedLength >= 11) hasBrutal = true;
                            if (selectedLength <= 5) hasEasy = true;
                            
                            // Remove from pool (without replacement)
                            remaining -= w[i];
                            w[i] = 0;
                            selected = true;
                        } else {
                            // Rejected due to constraints - remove weight and retry
                            remaining -= w[i];
                            w[i] = 0;
                        }
                        break;
                    }
                }
                
                attempts++;
                if (!selected) {
                    // Retry with new randomness
                    rand = uint256(keccak256(abi.encodePacked(randomSeed, pick, attempts)));
                }
            }
            
            require(selected, "Failed to select valid length");
        }
        
        return lengths;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  RULER VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Validates that all 3 valid lengths are within bounds, distinct, and satisfy safety constraints
    /// @param lengths Array of 3 lengths to validate
    /// @return True if all constraints are satisfied
    function validateRulerLengths(uint8[3] calldata lengths) external pure returns (bool) {
        uint8 brutalCount = 0;  // count of {11, 12}
        uint8 easyCount = 0;    // count of {4, 5}

        for (uint i = 0; i < 3; i++) {
            // Check bounds
            require(lengths[i] >= RULER_MIN_LENGTH && lengths[i] <= RULER_MAX_LENGTH, "Length out of bounds");
            
            // Check for duplicates
            for (uint j = i + 1; j < 3; j++) {
                require(lengths[i] != lengths[j], "Duplicate length");
            }
            
            // Count extremes
            if (lengths[i] >= 11) brutalCount++;
            if (lengths[i] <= 5) easyCount++;
        }

        // Safety constraints: max one from each extreme band
        require(brutalCount <= 1, "Max one of {11,12}");
        require(easyCount <= 1, "Max one of {4,5}");

        return true;
    }

    /// @notice Verifies the revealed lengths match the commitment hash from round open
    /// @param roundId The round identifier
    /// @param lengths The 3 revealed lengths
    /// @param rulerSalt The salt used in commitment
    /// @param commitHash The commitment hash from round open
    /// @return True if commitment is valid
    function verifyRulerCommitment(
        uint256 roundId,
        uint8[3] calldata lengths,
        bytes32 rulerSalt,
        bytes32 commitHash
    ) external pure returns (bool) {
        bytes32 calculatedHash = keccak256(abi.encodePacked(roundId, lengths[0], lengths[1], lengths[2], rulerSalt));
        return calculatedHash == commitHash;
    }

    /// @notice Check if a word length matches any of the 3 valid lengths
    /// @param wordLength The length of the submitted word
    /// @param validLengths Array of 3 valid lengths for this round
    /// @return True if word length is valid
    function validateWordLength(uint256 wordLength, uint8[3] memory validLengths) external pure returns (bool) {
        return wordLength == validLengths[0] || wordLength == validLengths[1] || wordLength == validLengths[2];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  GOVERNANCE
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Update ruler weights (owner only)
    /// @param newWeights Array of 9 weights for lengths 4–12
    function setRulerWeights(uint16[9] calldata newWeights) external {
        require(msg.sender == owner, "Only owner");
        
        uint16 sum = 0;
        for (uint i = 0; i < 9; i++) {
            require(newWeights[i] > 0, "Weight must be positive");
            sum += newWeights[i];
        }
        
        rulerWeights = newWeights;
        totalWeight = sum;
        
        emit RulerWeightsUpdated(newWeights, sum);
    }

    /// @notice Transfer ownership
    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "Only owner");
        require(newOwner != address(0), "Invalid owner");
        owner = newOwner;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// @notice Get all ruler weights
    function getRulerWeights() external view returns (uint16[9] memory) {
        return rulerWeights;
    }

    /// @notice Get spell name for display
    function getSpellName(uint8 spellId) external pure returns (string memory) {
        if (spellId == SPELL_VETO) return "Veto";
        if (spellId == SPELL_ANCHOR) return "Anchor";
        if (spellId == SPELL_SEAL) return "Seal";
        if (spellId == SPELL_GEM) return "Gem";
        return "Unknown";
    }

    /// @notice Generate ruler commitment hash
    /// @param roundId The round identifier
    /// @param lengths The 3 selected lengths
    /// @param salt Random salt for commitment
    /// @return The commitment hash
    function generateRulerCommitment(
        uint256 roundId,
        uint8[3] calldata lengths,
        bytes32 salt
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(roundId, lengths[0], lengths[1], lengths[2], salt));
    }
}