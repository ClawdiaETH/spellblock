#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"
# Post when commit phase closes and reveal begins (08:00 UTC / 2am CT)
# Reads contract from deployments file — no hardcoded addresses

cd "$(dirname "$0")"

DEPLOYMENTS="$HOME/clawd/projects/spellblock-unified/deployments/latest.json"
CONTRACT=$(cat "$DEPLOYMENTS" | /opt/homebrew/bin/jq -r '.contracts.SpellBlockGame')
ROUND=$(/Users/starl3xx/.foundry/bin/cast call $CONTRACT "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org 2>/dev/null)

if [ -z "$ROUND" ]; then
  echo "❌ Could not fetch round ID from $CONTRACT"
  exit 1
fi

echo "Contract: $CONTRACT"
echo "Round: $ROUND"

# Check numCommits — skip if nobody played
ROUND_DATA=$(/Users/starl3xx/.foundry/bin/cast call $CONTRACT "rounds(uint256)" $ROUND --rpc-url https://mainnet.base.org 2>/dev/null)
NUM_COMMITS=$(python3 -c "
h = '$ROUND_DATA'.replace('0x','')
chunks = [h[i:i+64] for i in range(0,len(h),64)]
print(int(chunks[15], 16)) if len(chunks) > 15 else print(0)
" 2>/dev/null)

if [ -z "$NUM_COMMITS" ] || [ "$NUM_COMMITS" -eq 0 ]; then
  echo "⏭️  Skipping post — round $ROUND had 0 commits"
  exit 0
fi

echo "Commits: $NUM_COMMITS"

TEXT="⏰ SpellBlock Round $ROUND commit phase closed!

Spell + Ruler are now revealed. Scoring is automatic — no action needed.

Results + payouts at 15:45 UTC (9:45 AM CT).

spellblock.app

@base"

echo "Posting: $TEXT"
/Users/starl3xx/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
/Users/starl3xx/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
