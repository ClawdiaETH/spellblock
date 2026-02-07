#!/bin/bash
# SpellBlock Mainnet - Open Round 1

set -e

# Contract addresses
GAME="0x4b8bf9004Ba309EB0169a97821D0eD993AF37961"
RPC="https://mainnet.base.org"
KEY=$(cat ~/.clawdbot/secrets/signing_key)

# Round 1 parameters
# Using fixed values so we can reveal them later
SEED="0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
RULER_SALT="0xfedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"

# Valid lengths: 5, 6, 7 (common word lengths)
LENGTHS_0=5
LENGTHS_1=6
LENGTHS_2=7

# Letter pool: 8 common letters - AEIOSTLN (as hex bytes8)
# A=0x41, E=0x45, I=0x49, O=0x4f, S=0x53, T=0x54, L=0x4c, N=0x4e
LETTER_POOL="0x414549534f544c4e"

# Compute seedHash = keccak256(seed)
SEED_HASH=$(cast keccak256 $SEED)
echo "Seed: $SEED"
echo "SeedHash: $SEED_HASH"

# Compute rulerCommitHash = keccak256(abi.encodePacked(roundId, l0, l1, l2, salt))
# roundId=1, lengths=[5,6,7]
RULER_COMMIT_HASH=$(cast keccak256 $(cast abi-encode "f(uint256,uint8,uint8,uint8,bytes32)" 1 $LENGTHS_0 $LENGTHS_1 $LENGTHS_2 $RULER_SALT | cut -c 3-))
echo "RulerSalt: $RULER_SALT"
echo "RulerCommitHash: $RULER_COMMIT_HASH"
echo "Valid lengths: $LENGTHS_0, $LENGTHS_1, $LENGTHS_2"
echo "Letter pool: $LETTER_POOL (AEISOTLN)"

echo ""
echo "Opening Round 1..."

# Call openRound(seedHash, rulerCommitHash, letterPool)
cast send $GAME "openRound(bytes32,bytes32,bytes8)" \
  $SEED_HASH \
  $RULER_COMMIT_HASH \
  $LETTER_POOL \
  --private-key $KEY \
  --rpc-url $RPC

echo ""
echo "Round 1 opened! Store these values for reveal phase:"
echo "SEED=$SEED"
echo "RULER_SALT=$RULER_SALT"
echo "LENGTHS=[$LENGTHS_0,$LENGTHS_1,$LENGTHS_2]"

# Save to file for later reveal
cat > /Users/starl3xx/clawd/projects/spellblock/round1-secrets.json << EOF
{
  "roundId": 1,
  "seed": "$SEED",
  "seedHash": "$SEED_HASH",
  "rulerSalt": "$RULER_SALT",
  "rulerCommitHash": "$RULER_COMMIT_HASH",
  "validLengths": [$LENGTHS_0, $LENGTHS_1, $LENGTHS_2],
  "letterPool": "$LETTER_POOL"
}
EOF
echo ""
echo "Secrets saved to round1-secrets.json"
