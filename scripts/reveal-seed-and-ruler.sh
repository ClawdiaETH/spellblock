#!/bin/bash
# Reveal seed and ruler for SpellBlock round
# Must be run by operator wallet

set -e

CONTRACTS_DIR="$HOME/clawd/projects/spellblock-unified/contracts"
CONTRACT=$(cat "$HOME/clawd/projects/spellblock-unified/deployments/latest.json" | jq -r '.contracts.SpellBlockGame')

# Get current round
CURRENT_ROUND=$(cast call $CONTRACT "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)
echo "Current round: $CURRENT_ROUND"

# Find most recent secrets file for this round
SECRETS_FILE=$(ls -t "$CONTRACTS_DIR"/ROUND_${CURRENT_ROUND}_SECRETS_*.txt 2>/dev/null | head -1)

if [ -z "$SECRETS_FILE" ]; then
  # Fallback to old naming scheme
  SECRETS_FILE=$(ls -t "$CONTRACTS_DIR"/ROUND_*_SECRETS_*.txt 2>/dev/null | head -1)
fi

if [ ! -f "$SECRETS_FILE" ]; then
  echo "❌ No secrets file found for Round $CURRENT_ROUND"
  exit 1
fi

echo "Using secrets file: $SECRETS_FILE"
echo ""

# Extract values from secrets file
SEED=$(grep "^Seed:" "$SECRETS_FILE" | awk '{print $2}')
RULER_SALT=$(grep "^Ruler Salt:" "$SECRETS_FILE" | awk '{print $3}')
LENGTHS=$(grep "^Valid Lengths:" "$SECRETS_FILE" | awk '{print $3, $4, $5}')

# Parse lengths into array format
L1=$(echo $LENGTHS | awk '{print $1}')
L2=$(echo $LENGTHS | awk '{print $2}')
L3=$(echo $LENGTHS | awk '{print $3}')

echo "=== SpellBlock Seed & Ruler Reveal ==="
echo "Round: $CURRENT_ROUND"
echo "Seed: $SEED"
echo "Ruler Salt: $RULER_SALT"
echo "Valid Lengths: [$L1, $L2, $L3]"
echo "Contract: $CONTRACT"
echo ""

# Get operator
OPERATOR=$(cast call $CONTRACT "operator()(address)" --rpc-url https://mainnet.base.org)
echo "Operator: $OPERATOR"
echo ""

# Check current wallet
PRIVATE_KEY=$(cat ~/.clawdbot/secrets/signing_key)
WALLET=$(cast wallet address --private-key $PRIVATE_KEY)
echo "Your wallet: $WALLET"
echo ""

if [ "$WALLET" != "$OPERATOR" ]; then
  echo "❌ ERROR: Your wallet ($WALLET) is not the operator ($OPERATOR)"
  echo ""
  echo "Solutions:"
  echo "1. Use the operator wallet to run this script"
  echo "2. Or have the owner call setOperator() to update the operator address"
  exit 1
fi

echo "✅ Wallet matches operator. Proceeding with reveal..."
echo ""

# Reveal seed and ruler
cast send $CONTRACT "revealSeedAndRuler(bytes32,uint8[3],bytes32)" \
  "$SEED" \
  "[$L1,$L2,$L3]" \
  "$RULER_SALT" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://mainnet.base.org

echo ""
echo "✅ Seed and ruler revealed!"
echo ""
echo "Spell and valid lengths are now visible to all players."
echo "Reveal phase continues until 15:45 UTC / 10:45 AM ET."
