#!/bin/bash
# Post when seed revealed (00:00 UTC / 6pm CT)

cd "$(dirname "$0")"

ROUND=$(cast call 0xF3cCa88c9F00b5EdD523797f4c04A6c3C20E317e "currentRound()(uint256)" --rpc-url https://mainnet.base.org)

TEXT="⏰ SpellBlock Round $ROUND commit phase closed!

Seed revealed — reveal your words in the next 4 hours.

Unrevealed commits = forfeited entry.

spellblock.app

@base"

~/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
~/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
