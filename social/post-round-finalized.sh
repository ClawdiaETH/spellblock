#!/bin/bash
# Post when round finalized (04:00 UTC / 10pm CT)

cd "$(dirname "$0")"

ROUND=$(cast call 0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9 "currentRound()(uint256)" --rpc-url https://mainnet.base.org)

TEXT="🏆 SpellBlock Round $((ROUND - 1)) results are IN!

Winner and prize announced on-chain.

Next round starts in 12 hours — 10am CT / 4pm UTC.

spellblock.app

@base"

~/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
~/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
