#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"
# Post when commit phase closes and reveal begins (08:00 UTC / 2am CT)

cd "$(dirname "$0")"

ROUND=$(/Users/starl3xx/.foundry/bin/cast call 0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9 "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)

TEXT="⏰ SpellBlock Round $ROUND commit phase closed!

Seed revealed — you have 7h45m to reveal your words.

Unrevealed commits = forfeited entry.

spellblock.app

@base"

/Users/starl3xx/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
/Users/starl3xx/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
