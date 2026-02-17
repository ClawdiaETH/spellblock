#!/bin/bash
# Post when round opens (16:00 UTC / 10am CT)

cd "$(dirname "$0")"

ROUND=$(cast call 0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9 "currentRound()(uint256)" --rpc-url https://mainnet.base.org)
LETTERS=$(node -e "
const { createPublicClient, http, parseAbiItem } = require('viem');
const { base } = require('viem/chains');

async function getLetters() {
  const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
  const logs = await client.getLogs({
    address: '0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9',
    event: parseAbiItem('event RoundOpened(uint256 indexed round, bytes8 letters)'),
    fromBlock: 'latest',
    toBlock: 'latest'
  });
  if (logs.length > 0) {
    const letters = logs[0].args.letters;
    return Buffer.from(letters.slice(2), 'hex').toString('utf8');
  }
  return null;
}
getLetters().then(l => console.log(l || ''));
")

if [ -z "$LETTERS" ]; then
  echo "No letters found"
  exit 1
fi

TEXT="SpellBlock Round $ROUND is LIVE! 🔮

Your letters: $LETTERS

8 hours to commit your best 5-letter words.
Prize: \$CLAWDIA

Play: spellblock.app

@base"

~/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
~/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
