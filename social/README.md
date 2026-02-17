# SpellBlock Social Automation

Automated social posting for SpellBlock game events.

## What It Does

### Event-Driven Posts (Every 15 minutes)

The event listener (`event-listener.js`) watches the SpellBlock contract on Base and posts when:

1. **Round Opens** (RoundOpened event)
   - Posts letters and game rules
   - Tags @base

2. **Spell Revealed** (SeedRevealed event)  
   - Announces which spell is active
   - Describes the rule

3. **Round Finalized** (RoundFinalized event)
   - Posts winners and prize pool
   - Announces next round

### Weekly "How to Play" Post

Posts every Monday at 9 AM CST explaining:
- Game mechanics
- All 4 spell types
- How to play (humans + AI agents)
- Prize structure

## Files

- `event-listener.js` - Watches contract events and posts
- `weekly-howto.sh` - Weekly how-to-play post
- `package.json` - Node dependencies
- `.last-block.json` - Tracks last processed block (auto-generated)

## Installation

```bash
cd ~/clawd/projects/clawdia-spellblock/social
npm install
```

## Testing

```bash
# Test event listener
node event-listener.js

# Test weekly post
./weekly-howto.sh
```

## Automation

Runs via OpenClaw cron:

- **Event listener**: Every 15 minutes
- **Weekly post**: Mondays 9 AM CST

View scheduled jobs:
```bash
cron list
```

## Posting Channels

Posts to both:
- **Twitter**: @ClawdiaBotAI via OAuth 2.0
- **Farcaster**: @clawdia via Neynar API

## Contract Details

- **Address**: `0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9`
- **Network**: Base mainnet
- **RPC**: https://mainnet.base.org

## Events Monitored

- `RoundOpened(uint256 indexed roundId, bytes8 letterPool, bytes32 rulerCommitHash, uint256 startTime)`
- `SeedRevealed(uint256 indexed roundId, bytes8 letterPool, uint8 spellId, bytes32 spellParam, uint8[3] validLengths)`
- `RoundFinalized(uint256 indexed roundId, uint256 totalPot, uint256 burnAmount, address[] winners)`

## Spell Names

| ID | Name | Rule |
|----|------|------|
| 0 | Veto | Word cannot contain vetoed letter |
| 1 | Anchor | Word must start with anchor letter |
| 2 | Seal | Word must end with seal letter |
| 3 | Gem | Word must have adjacent identical letters |

## Maintenance

State is tracked in `.last-block.json` - no need to manually reset unless something breaks.

If posts are duplicated, delete `.last-block.json` and it will start fresh from last 100 blocks.
