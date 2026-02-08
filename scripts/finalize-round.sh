#!/bin/bash
# Finalize SpellBlock round (distribute rewards, burn tokens)
# Should run at 15:45 UTC daily (after reveal phase ends)

set -e

CONTRACT=$(cat "$HOME/clawd/projects/spellblock-unified/deployments/latest.json" | jq -r '.contracts.SpellBlockGame')
PRIVATE_KEY=$(cat ~/.clawdbot/secrets/signing_key)
WALLET=$(cast wallet address --private-key $PRIVATE_KEY)

# Get current round
CURRENT_ROUND=$(cast call $CONTRACT "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)

echo "=== SpellBlock Round $CURRENT_ROUND Finalization ==="
echo "Contract: $CONTRACT"
echo "Operator: $WALLET"
echo ""

# Check if already finalized
ROUND_DATA=$(cast call $CONTRACT "rounds(uint256)" $CURRENT_ROUND --rpc-url https://mainnet.base.org)
# Extract finalized bool (field 17, byte offset varies)
# For simplicity, just attempt finalization - contract will revert if already done

echo "Finalizing Round $CURRENT_ROUND..."
TX=$(cast send $CONTRACT \
  "finalizeRound()" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://mainnet.base.org \
  --json 2>&1)

if echo "$TX" | grep -q "transactionHash"; then
  TX_HASH=$(echo $TX | jq -r '.transactionHash')
  echo "✅ Round $CURRENT_ROUND finalized!"
  echo "TX: https://basescan.org/tx/$TX_HASH"
  echo ""
  echo "Winners paid, consolation recovered, tokens burned."
  echo "Next round opens at 16:00 UTC / 11:00 AM ET."
elif echo "$TX" | grep -q "Already finalized"; then
  echo "⚠️ Round already finalized"
else
  echo "❌ Finalization failed:"
  echo "$TX"
  exit 1
fi
