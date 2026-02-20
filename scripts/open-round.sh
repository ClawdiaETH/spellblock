#!/bin/bash
# Open next SpellBlock round with fresh seed/ruler/pool
# Should run at 16:00 UTC daily

set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"

CONTRACTS_DIR="$HOME/clawd/projects/spellblock-unified/contracts"
CONTRACT=$(cat "$HOME/clawd/projects/spellblock-unified/deployments/latest.json" | /opt/homebrew/bin/jq -r '.contracts.SpellBlockGame')
PRIVATE_KEY=$(~/clawd/scripts/get-secret.sh signing_key)
WALLET=$(/Users/starl3xx/.foundry/bin/cast wallet address --private-key $PRIVATE_KEY)

# Get current round
CURRENT_ROUND=$(/Users/starl3xx/.foundry/bin/cast call $CONTRACT "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)
NEXT_ROUND=$((CURRENT_ROUND + 1))

echo "=== SpellBlock Round $NEXT_ROUND Opening ==="
echo "Contract: $CONTRACT"
echo "Operator: $WALLET"
echo ""

# Generate random seed and ruler salt
SEED=$(openssl rand -hex 32)
RULER_SALT=$(openssl rand -hex 32)

# Random letter pool (8 unique letters, guaranteed ≥2 vowels per contract requirement)
LETTERS=$(python3 -c "
import random
vowels = list('AEIOU')
consonants = list('BCDFGHJKLMNPQRSTVWXYZ')
random.shuffle(vowels)
random.shuffle(consonants)
pool = vowels[:3] + consonants[:5]
random.shuffle(pool)
print(''.join(pool[:8]))
")

# Hash seed
SEED_HASH=$(/Users/starl3xx/.foundry/bin/cast keccak "0x$SEED")

# Pick 3 random valid lengths (4-8)
LENGTHS=($(shuf -i 4-8 -n 3 | sort -n))
RULER_STRING="${LENGTHS[0]}${LENGTHS[1]}${LENGTHS[2]}"

# Compute rulerCommitHash matching contract's keccak256(abi.encodePacked(roundId, l0, l1, l2, salt))
# Pack: uint256(32 bytes) + uint8 + uint8 + uint8 + bytes32 = 67 bytes
ROUND_HEX=$(printf '%064x' $NEXT_ROUND)
L0_HEX=$(printf '%02x' ${LENGTHS[0]})
L1_HEX=$(printf '%02x' ${LENGTHS[1]})
L2_HEX=$(printf '%02x' ${LENGTHS[2]})
RULER_PACKED="0x${ROUND_HEX}${L0_HEX}${L1_HEX}${L2_HEX}${RULER_SALT}"
RULER_COMMIT_HASH=$(/Users/starl3xx/.foundry/bin/cast keccak "$RULER_PACKED")

# Convert letter pool to bytes8
LETTER_POOL_HEX="0x$(echo -n "$LETTERS" | xxd -p | tr -d '\n')"

# Verify 8 letters
if [ ${#LETTER_POOL_HEX} -ne 18 ]; then
  echo "ERROR: Letter pool must be 8 letters (got ${#LETTERS})"
  exit 1
fi

echo "Seed: 0x$SEED"
echo "Seed Hash: $SEED_HASH"
echo "Ruler Salt: 0x$RULER_SALT"
echo "Valid Lengths: ${LENGTHS[@]}"
echo "Ruler Commit Hash: $RULER_COMMIT_HASH"
echo "Letter Pool: $LETTERS"
echo "Letter Pool (hex): $LETTER_POOL_HEX"
echo ""

# Save secrets
SECRETS_FILE="$CONTRACTS_DIR/ROUND_${NEXT_ROUND}_SECRETS_$(date +%Y%m%d_%H%M).txt"
cat > "$SECRETS_FILE" <<EOF
Round $NEXT_ROUND Secrets - $(date)
Contract: $CONTRACT

Seed: 0x$SEED
Seed Hash: $SEED_HASH

Ruler Salt: 0x$RULER_SALT
Valid Lengths: ${LENGTHS[@]}
Ruler Commit Hash: $RULER_COMMIT_HASH

Letter Pool: $LETTERS
Letter Pool (hex): $LETTER_POOL_HEX
EOF

echo "Secrets saved: $SECRETS_FILE"
echo ""

# Open round
echo "Opening Round $NEXT_ROUND..."
TX=$(/Users/starl3xx/.foundry/bin/cast send $CONTRACT \
  "openRound(bytes32,bytes32,bytes8)" \
  "$SEED_HASH" \
  "$RULER_COMMIT_HASH" \
  "$LETTER_POOL_HEX" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://mainnet.base.org \
  --json)

TX_HASH=$(echo $TX | jq -r '.transactionHash')
echo "✅ Round $NEXT_ROUND opened!"
echo "TX: https://basescan.org/tx/$TX_HASH"
echo ""
echo "Commit phase open until 08:00 UTC / 03:00 AM ET tomorrow"
