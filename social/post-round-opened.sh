#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$HOME/.foundry/bin:$PATH"
# Post when round opens (16:00 UTC / 10am CT)
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

# Get letters from recent RoundOpened event
LETTERS=$(/opt/homebrew/bin/node -e "
const { createPublicClient, http, parseAbiItem } = require('viem');
const { base } = require('viem/chains');
const CONTRACT = '$CONTRACT';

async function getLetters() {
  const client = createPublicClient({ chain: base, transport: http('https://mainnet.base.org') });
  const latestBlock = await client.getBlockNumber();
  const fromBlock = latestBlock - 2000n;
  const logs = await client.getLogs({
    address: CONTRACT,
    event: parseAbiItem('event RoundOpened(uint256 indexed round, bytes8 letters)'),
    fromBlock,
    toBlock: 'latest'
  });
  if (logs.length > 0) {
    const letters = logs[logs.length - 1].args.letters;
    return Buffer.from(letters.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
  }
  return null;
}
getLetters().then(l => console.log(l || '')).catch(() => console.log(''));
" 2>/dev/null)

if [ -z "$LETTERS" ]; then
  echo "No letters found in recent events — round may not have opened yet"
  exit 1
fi

TEXT="SpellBlock Round $ROUND is LIVE! 🔮

Your letters: $LETTERS

8 hours to commit your best words.
Prize: \$CLAWDIA

Play: spellblock.app

@base"

echo "Posting: $TEXT"
/Users/starl3xx/clawd/skills/x-api/scripts/x-post.mjs "$TEXT"
/Users/starl3xx/clawd/scripts/farcaster-cast.sh "$TEXT" --channel=base
