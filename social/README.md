# SpellBlock Social Automation

Automated social posting for SpellBlock game events.

## What It Does

Posts aligned to actual on-chain game phases (contract: 16h commit, automated reveal at 08:00 UTC):

1. **Round Opens** (16:05 UTC / 10:05am CT daily)
   - Posts letters for the new round
   - Tags @base

2. **Commit Closed / Spell Revealed** (08:05 UTC / 2:05am CT daily)
   - Announces spell + ruler revealed
   - Scoring is fully automated — players just wait
   - Results at 15:45 UTC (9:45 AM CT)

3. **Round Finalized** (15:50 UTC / 9:50am CT daily)
   - Announces results on-chain
   - Notes next round opens in ~10 min

4. **Weekly How-to** (Mondays 15:00 UTC / 9am CT)
   - Explains game mechanics
   - Describes all 4 spells
   - Prize structure

## Files

- `post-round-opened.sh` - Posts when round opens
- `post-seed-revealed.sh` - Posts when commit phase ends
- `post-round-finalized.sh` - Posts when round settles
- `weekly-howto.sh` - Weekly gameplay guide

## Installation

No dependencies - uses `cast` CLI for blockchain queries.

## Testing

```bash
# Test individual posts
./post-round-opened.sh
./post-seed-revealed.sh
./post-round-finalized.sh
./weekly-howto.sh
```

## Automation

Runs via crontab:

```bash
# Round opened (16:05 UTC / 10:05am CT daily)
5 16 * * * ~/clawd/projects/clawdia-spellblock/social/post-round-opened.sh >> ~/clawd/logs/spellblock-social.log 2>&1

# Commit closed / reveal begins (08:05 UTC / 2:05am CT daily)
5 8 * * * ~/clawd/projects/clawdia-spellblock/social/post-seed-revealed.sh >> ~/clawd/logs/spellblock-social.log 2>&1

# Round finalized (15:50 UTC / 9:50am CT daily)
50 15 * * * ~/clawd/projects/clawdia-spellblock/social/post-round-finalized.sh >> ~/clawd/logs/spellblock-social.log 2>&1

# Weekly how-to (Mondays 15:00 UTC / 9am CT)
0 15 * * 1 ~/clawd/projects/clawdia-spellblock/social/weekly-howto.sh >> ~/clawd/logs/spellblock-social.log 2>&1
```

## Posting Channels

Posts to both:
- **Twitter**: @ClawdiaBotAI via OAuth 2.0 (`~/clawd/skills/x-api/scripts/x-post.mjs`)
- **Farcaster**: @clawdia via Neynar API (`~/clawd/scripts/farcaster-cast.sh`)

## Contract Details

- **Address**: `0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9` (updated 2026-02-18 with vowel validation + burn fixes)
- **Network**: Base mainnet
- **RPC**: https://mainnet.base.org

## Round Schedule

- **Opens**: 16:00 UTC (10am CT)
- **Commit closes**: 08:00 UTC (16 hours later / 2am CT)
- **Finalize**: 15:45 UTC (9:45 AM CT)
- **Finalize**: 15:45 UTC (9:45am CT, ~15 min before next open)
- **Next round**: 16:00 UTC (10am CT)

## Spells

| ID | Name | Rule |
|----|------|------|
| 0 | Veto | Word cannot contain vetoed letter |
| 1 | Anchor | Word must start with anchor letter |
| 2 | Seal | Word must end with seal letter |
| 3 | Gem | Word must have adjacent identical letters (like "coffee") |
