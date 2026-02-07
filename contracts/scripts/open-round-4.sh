#!/bin/bash
# Open Round 4 on the new SpellBlock contract

# Contract address
CONTRACT="0x451523CB691d694C9711dF0f4FC12E9e3ff293ca"

# Generate random seed and salt
SEED=$(openssl rand -hex 32)
RULER_SALT=$(openssl rand -hex 32)

# Round 4 data
ROUND_ID=4
L1=4
L2=5
L3=6
LETTER_POOL="ABCDEFGH"

# Calculate hashes
SEED_HASH=$(cast keccak "0x${SEED}")
echo "Seed: 0x${SEED}"
echo "SeedHash: ${SEED_HASH}"

# Calculate ruler commit hash: keccak256(abi.encodePacked(roundId, L1, L2, L3, rulerSalt))
RULER_COMMIT_HASH=$(cast keccak "$(cast abi-encode "f(uint256,uint8,uint8,uint8,bytes32)" ${ROUND_ID} ${L1} ${L2} ${L3} 0x${RULER_SALT})")
echo "RulerSalt: 0x${RULER_SALT}"
echo "RulerCommitHash: ${RULER_COMMIT_HASH}"

# Convert letter pool to bytes8 (hex encoded)
LETTER_POOL_HEX="0x$(echo -n "${LETTER_POOL}" | xxd -p)"
echo "LetterPool: ${LETTER_POOL}"
echo "LetterPoolHex: ${LETTER_POOL_HEX}"

# Call openRound
echo ""
echo "Opening Round 4..."
cast send ${CONTRACT} "openRound(bytes32,bytes32,bytes8)" \
  ${SEED_HASH} \
  ${RULER_COMMIT_HASH} \
  ${LETTER_POOL_HEX} \
  --private-key $(cat ~/.clawdbot/secrets/signing_key) \
  --rpc-url https://mainnet.base.org \
  --legacy

echo ""
echo "Round 4 opened!"
echo ""
echo "⚠️ SAVE THESE VALUES FOR LATER:"
echo "Seed: 0x${SEED}"
echo "RulerSalt: 0x${RULER_SALT}"
echo "Valid Lengths: [${L1}, ${L2}, ${L3}]"
