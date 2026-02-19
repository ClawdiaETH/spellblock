#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"
# Post when round finalized (15:50 UTC / 9:50am CT, after finalize-round.sh at 9:45am CT)

cd "$(dirname "$0")"

ROUND=$(/Users/starl3xx/.foundry/bin/cast call 0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9 "currentRoundId()(uint256)" --rpc-url https://mainnet.base.org)

TEXT="🏆 SpellBlock Round $ROUND results are IN!

Winner and prize distributed on-chain.

Next round opens in ~10 minutes — 10am CT / 16:00 UTC.

spellblock.app

@base"

/Users/starl3xx/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
/Users/starl3xx/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
