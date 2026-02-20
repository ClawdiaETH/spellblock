#!/bin/bash
# Finalize SpellBlock round (distribute rewards, burn tokens)
# Should run at 15:45 UTC daily (after reveal phase ends)

set -e
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"

CONTRACT=$(cat "$HOME/clawd/projects/spellblock-unified/deployments/latest.json" | /opt/homebrew/bin/jq -r '.contracts.SpellBlockGame')
PRIVATE_KEY=$(~/clawd/scripts/get-secret.sh signing_key)
WALLET=$(/Users/starl3xx/.foundry/bin/cast wallet address --private-key $PRIVATE_KEY)

# Get current round
CURRENT_ROUND=$(/Users/starl3xx/.foundry/bin/cast call $CONTRACT "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)

echo "=== SpellBlock Round $CURRENT_ROUND Finalization ==="
echo "Contract: $CONTRACT"
echo "Operator: $WALLET"
echo ""

echo "Finalizing Round $CURRENT_ROUND..."
TX=$(/Users/starl3xx/.foundry/bin/cast send $CONTRACT \
  "finalizeRound()" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://mainnet.base.org \
  --json 2>&1)

if echo "$TX" | grep -q "transactionHash"; then
  TX_HASH=$(echo $TX | /opt/homebrew/bin/jq -r '.transactionHash')
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
