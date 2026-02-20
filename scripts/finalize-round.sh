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

# Check that reveal deadline has passed before attempting finalize
REVEAL_DEADLINE=$(/Users/starl3xx/.foundry/bin/cast call $CONTRACT "rounds(uint256)(uint256,uint256,uint256,uint256)" "$CURRENT_ROUND" --rpc-url https://mainnet.base.org 2>/dev/null | awk 'NR==4{print $1}')
NOW=$(date +%s)
if [ -n "$REVEAL_DEADLINE" ] && [ "$NOW" -lt "$REVEAL_DEADLINE" ]; then
  WAIT_MINS=$(( (REVEAL_DEADLINE - NOW) / 60 ))
  echo "⏳ Reveal phase still open for ~${WAIT_MINS} more minutes"
  echo "Skipping finalize — reveal deadline not yet reached."
  exit 0
fi

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
