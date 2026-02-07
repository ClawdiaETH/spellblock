#!/bin/bash
set -e

CONTRACTS_DIR="$HOME/clawd/projects/spellblock-unified/contracts"
FRONTEND_DIR="$HOME/clawd/projects/spellblock-unified/frontend"
SIGNING_KEY=$(cat ~/.clawdbot/secrets/signing_key)

cd "$CONTRACTS_DIR"

echo "=== Deploying SpellBlock Contract ==="
forge script script/Deploy.s.sol:DeploySpellBlock \
  --rpc-url https://mainnet.base.org \
  --private-key "$SIGNING_KEY" \
  --broadcast \
  --verify

echo ""
echo "=== Extracting Contract Addresses ==="
DEPLOYMENT_FILE=$(ls -t broadcast/Deploy.s.sol/8453/run-*.json | head -1)
SPELLBLOCK_ADDRESS=$(jq -r '.transactions[] | select(.contractName == "SpellBlockGame") | .contractAddress' "$DEPLOYMENT_FILE")

echo "SpellBlock deployed at: $SPELLBLOCK_ADDRESS"

echo ""
echo "=== Generating Round 1 Secrets ==="
# Generate random seed and ruler salt
SEED=$(openssl rand -hex 32)
RULER_SALT=$(openssl rand -hex 32)

# Random letter pool (8 unique letters)
LETTERS=$(echo {A..Z} | tr ' ' '\n' | shuf | head -8 | tr -d '\n')

# Hash seed and ruler parameters
SEED_HASH=$(cast keccak "$SEED")

# Pick 3 random valid lengths (4-8)
LENGTHS=($(shuf -i 4-8 -n 3 | sort -n))
RULER_STRING="${LENGTHS[0]}${LENGTHS[1]}${LENGTHS[2]}"
RULER_COMMIT_HASH=$(cast keccak "$(echo -n "${RULER_STRING}${RULER_SALT}")")

# Convert letter pool to bytes8 (hex encoding)
LETTER_POOL_HEX="0x$(echo -n "$LETTERS" | xxd -p | tr -d '\n')"
# Pad to 8 bytes (16 hex chars after 0x)
LETTER_POOL_HEX=$(printf "0x%-16s" "${LETTER_POOL_HEX:2}" | tr ' ' '0')

echo "Seed: $SEED"
echo "Seed Hash: $SEED_HASH"
echo "Ruler Salt: $RULER_SALT"
echo "Valid Lengths: ${LENGTHS[@]}"
echo "Ruler Commit Hash: $RULER_COMMIT_HASH"
echo "Letter Pool: $LETTERS"
echo "Letter Pool (hex): $LETTER_POOL_HEX"

# Save secrets
SECRETS_FILE="$CONTRACTS_DIR/ROUND_1_SECRETS_$(date +%Y%m%d).txt"
cat > "$SECRETS_FILE" <<EOF
Round 1 Secrets - $(date)
Contract: $SPELLBLOCK_ADDRESS

Seed: $SEED
Seed Hash: $SEED_HASH

Ruler Salt: $RULER_SALT
Valid Lengths: ${LENGTHS[@]}
Ruler Commit Hash: $RULER_COMMIT_HASH

Letter Pool: $LETTERS
Letter Pool (hex): $LETTER_POOL_HEX
EOF

echo ""
echo "=== Opening Round 1 ==="
cast send "$SPELLBLOCK_ADDRESS" \
  "openRound(bytes32,bytes32,bytes8)" \
  "$SEED_HASH" \
  "$RULER_COMMIT_HASH" \
  "$LETTER_POOL_HEX" \
  --private-key "$SIGNING_KEY" \
  --rpc-url https://mainnet.base.org

echo ""
echo "=== Updating Frontend Config ==="
cd "$FRONTEND_DIR"

# Update contract address
sed -i '' "s/0x[0-9a-fA-F]\{40\}/$SPELLBLOCK_ADDRESS/g" src/config/contracts.ts

# Commit and push
cd "$HOME/clawd/projects/spellblock-unified"
git add -A
git commit -m "Deploy new SpellBlock contract and open Round 1

Contract: $SPELLBLOCK_ADDRESS
Round 1 opened at $(date -u +%Y-%m-%d\ %H:%M:%S) UTC"
git push

# Deploy to Vercel
cd "$FRONTEND_DIR"
vercel --prod --yes

echo ""
echo "=== DEPLOYMENT COMPLETE ==="
echo "Contract: $SPELLBLOCK_ADDRESS"
echo "Round 1 opened at $(date -u +%Y-%m-%d\ %H:%M:%S) UTC"
echo "Secrets saved to: $SECRETS_FILE"
