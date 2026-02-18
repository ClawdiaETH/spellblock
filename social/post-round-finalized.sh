#!/bin/bash
# Post when round finalized (04:00 UTC / 10pm CT)

cd "$(dirname "$0")"

ROUND=$(cast call 0xF3cCa88c9F00b5EdD523797f4c04A6c3C20E317e "currentRound()(uint256)" --rpc-url https://mainnet.base.org)

TEXT="🏆 SpellBlock Round $((ROUND - 1)) results are IN!

Winner and prize announced on-chain.

Next round starts in 12 hours — 10am CT / 4pm UTC.

spellblock.app

@base"

~/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
~/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
