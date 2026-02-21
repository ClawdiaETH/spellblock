# Letter Pool Encoding Documentation

## Overview

SpellBlock uses `bytes8` to store 8 uppercase letters for each round. This document explains the correct encoding format and validation procedures to prevent bugs.

---

## ⚠️ The Bug That Was Fixed

### Problem
Early rounds had issues with letter pool encoding:
- **Round 2**: Had duplicate letters (R×2, E×2) in "RIDENTER"  
- **Potential issue**: If letter pool was ever passed as `0x0000000000000000` (empty), spell generation would fail and produce garbage data

### Why It Matters
During spell generation in `revealSeedAndRuler()`, the contract does:
```solidity
uint256 letterIndex = (spellSeed >> 8) % 8;
r.spellParam = bytes32(bytes1(r.letterPool[letterIndex]));
```

If `letterPool` is empty (`0x0000000000000000`), then `r.letterPool[letterIndex]` returns `0x00`, causing:
- Veto spell to veto a null character (or garbage)
- Anchor/Seal spells to require null character
- Breaks game logic completely

### Solution
Added multiple validation layers:
1. ✅ Contract-level validation in `openRound()`
2. ✅ Script-level validation before deployment
3. ✅ Comprehensive test suite
4. ✅ Dry-run preview before deployment

---

## Correct Encoding Format

### String → bytes8 Conversion

Each letter is encoded as its ASCII hex value:

| Letter | ASCII Decimal | ASCII Hex | In bytes8 |
|--------|---------------|-----------|-----------|
| A | 65 | 0x41 | Position 0 |
| B | 66 | 0x42 | Position 1 |
| ... | ... | ... | ... |
| Z | 90 | 0x5A | Position 7 |

### Examples

#### "ABCDEFGH"
```
String: A    B    C    D    E    F    G    H
ASCII:  0x41 0x42 0x43 0x44 0x45 0x46 0x47 0x48
bytes8: 0x4142434445464748
```

#### "HRMEIBSD" (Round 3)
```
String: H    R    M    E    I    B    S    D
ASCII:  0x48 0x52 0x4D 0x45 0x49 0x42 0x53 0x44
bytes8: 0x48524D4549425344
```

#### "AEISOTLN" (Round 1)
```
String: A    E    I    S    O    T    L    N
ASCII:  0x41 0x45 0x49 0x53 0x4F 0x54 0x4C 0x4E
bytes8: 0x414549534F544C4E
```

---

## Validation Rules

### Required Constraints

1. **Non-empty**: `letterPool != 0x0000000000000000`
2. **Valid ASCII range**: Each byte must be `0x41-0x5A` (uppercase A-Z)
3. **Exactly 8 letters**: No more, no less
4. **No duplicates**: All 8 letters must be unique
5. **Reasonable distribution**: 2-6 vowels, 2-6 consonants (recommended)

### Contract-Level Validation

Added to `SpellBlockGame.sol::openRound()`:

```solidity
// Validate letter pool is not empty
require(letterPool != bytes8(0), "Letter pool cannot be empty");

// Validate all 8 bytes are valid ASCII uppercase letters (A-Z = 0x41-0x5A)
for (uint256 i = 0; i < 8; i++) {
    bytes1 letter = letterPool[i];
    require(
        uint8(letter) >= 0x41 && uint8(letter) <= 0x5A,
        "Letter pool must contain only uppercase A-Z"
    );
}
```

### Script-Level Validation

Use `verify-letter-pool-encoding.js`:

```bash
node scripts/verify-letter-pool-encoding.js
```

This checks:
- ✅ Encoding/decoding round-trip
- ✅ All 8 bytes are valid A-Z
- ✅ No duplicates
- ✅ Vowel/consonant balance
- ✅ Onchain data integrity

---

## Tools & Scripts

### 1. Generate Letters (with validation)
```bash
node scripts/generate-random-letters.js
```

Features:
- Generates 8 unique random letters
- Weighted by English letter frequency
- Validates no duplicates
- Checks vowel/consonant balance
- Outputs correct bytes8 hex

### 2. Verify Encoding
```bash
node scripts/verify-letter-pool-encoding.js
```

Features:
- Tests encoding/decoding
- Checks onchain data for all rounds
- Detects empty pools
- Validates letter format

### 3. Safe Deployment (RECOMMENDED)
```bash
# Dry run first (shows what would be deployed)
node scripts/deploy-round-safe.js --dry-run

# Deploy for real
node scripts/deploy-round-safe.js
```

Features:
- ✅ Multiple validation layers
- ✅ Shows hex breakdown before deployment
- ✅ Dry-run preview
- ✅ Confirmation prompt
- ✅ Saves configuration for reveal phase

---

## Deployment Checklist

Before deploying a new round:

- [ ] 1. Generate letters: `node scripts/generate-random-letters.js`
- [ ] 2. Verify no duplicates in output
- [ ] 3. Run dry-run: `node scripts/deploy-round-safe.js --dry-run`
- [ ] 4. Review letter pool hex encoding
- [ ] 5. Verify vowel/consonant balance
- [ ] 6. Deploy: `node scripts/deploy-round-safe.js`
- [ ] 7. Verify onchain: `node scripts/verify-letter-pool-encoding.js`
- [ ] 8. Save secrets file for reveal phase

---

## Testing

Run letter pool encoding tests:

```bash
cd contracts
forge test --match-contract LetterPoolEncodingTest -vv
```

Tests include:
- ✅ Basic encoding/decoding
- ✅ Round 1, 2, 3 letter pools
- ✅ Empty pool detection
- ✅ Letter extraction (spell generation)
- ✅ Invalid character detection
- ✅ Random extraction simulation
- ✅ Fuzz testing (256 runs)

---

## Common Issues & Solutions

### Issue: "Letter pool cannot be empty"
**Cause**: Tried to pass `0x0000000000000000` to `openRound()`  
**Solution**: Use `generate-random-letters.js` to create valid pool

### Issue: "Letter pool must contain only uppercase A-Z"
**Cause**: Invalid byte in letter pool (lowercase, number, special char)  
**Solution**: Ensure all letters are uppercase A-Z before encoding

### Issue: Duplicate letters
**Cause**: Used same letter twice in 8-letter string  
**Solution**: Use `generateValidatedLetterPool()` which prevents duplicates

### Issue: Poor vowel/consonant balance
**Cause**: Random generation produced extreme distribution  
**Solution**: Script will retry until reasonable balance is found

---

## Manual Encoding (if needed)

If you need to manually encode letters:

```javascript
function stringToBytes8(letters) {
    if (letters.length !== 8) {
        throw new Error('Must be exactly 8 letters');
    }
    
    let hex = '0x';
    for (let i = 0; i < 8; i++) {
        // Get ASCII code and convert to hex
        hex += letters.charCodeAt(i).toString(16).toUpperCase();
    }
    
    return hex;
}

// Example:
stringToBytes8('HRMEIBSD')
// Returns: 0x48524D4549425344
```

Using `cast`:
```bash
# Each letter to hex
cast --to-base "$(printf 'H' | od -An -tu1 | xargs)" 16  # 48
cast --to-base "$(printf 'R' | od -An -tu1 | xargs)" 16  # 52
# ... repeat for all 8 letters, then concatenate with 0x prefix
```

---

## Contract Integration

### Opening a Round
```solidity
function openRound(
    bytes32 seedHash,
    bytes32 rulerCommitHash,
    bytes8 letterPool  // ← Must be valid 8 uppercase letters
) external onlyOperator whenNotPaused {
    require(letterPool != bytes8(0), "Letter pool cannot be empty");
    // ... validation and round creation
}
```

### Spell Generation (Reveal Phase)
```solidity
function revealSeedAndRuler(...) external onlyOperator {
    // Generate spell from seed
    uint256 spellSeed = uint256(finalRandomness);
    r.spellId = uint8(spellSeed % 4);
    
    // For Veto/Anchor/Seal, pick a letter from pool
    if (r.spellId < 3) {
        uint256 letterIndex = (spellSeed >> 8) % 8;
        r.spellParam = bytes32(bytes1(r.letterPool[letterIndex]));
        // ↑ This reads from letterPool, so it must be valid!
    }
}
```

---

## Round History

| Round | Letters | Hex | Status |
|-------|---------|-----|--------|
| 1 | AEISOTLN | `0x414549534F544C4E` | ✅ Valid |
| 2 | RIDENTER | `0x524944454E544552` | ⚠️ Duplicates (R×2, E×2) |
| 3 | HRMEIBSD | `0x48524D4549425344` | ✅ Valid |
| 4+ | TBD | TBD | Use safe deployment script |

---

## Summary

**Key Takeaways:**
1. Letter pool must be exactly 8 unique uppercase letters
2. Empty pools (`0x0000000000000000`) will break spell generation
3. Use `deploy-round-safe.js` for all future deployments
4. Always run `--dry-run` first to preview
5. Verify onchain data after deployment

**Prevention:**
- ✅ Contract validates at deployment
- ✅ Scripts validate before submission
- ✅ Tests prove encoding works correctly
- ✅ Documentation prevents confusion

**This issue is now prevented at multiple levels and cannot happen in future rounds.**
