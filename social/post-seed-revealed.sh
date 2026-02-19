#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"
# Post when seed revealed (00:00 UTC / 6pm CT)

cd "$(dirname "$0")"

ROUND=$(/Users/starl3xx/.foundry/bin/cast call 0xF3cCa88c9F00b5EdD523797f4c04A6c3C20E317e "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)

TEXT="⏰ SpellBlock Round $ROUND commit phase closed!

Seed revealed — reveal your words in the next 4 hours.

Unrevealed commits = forfeited entry.

spellblock.app

@base"

/Users/starl3xx/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
/Users/starl3xx/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
