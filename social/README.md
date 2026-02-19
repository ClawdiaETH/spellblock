# SpellBlock Social Automation

Automated social posting for SpellBlock game events.

## What It Does

Posts at exact times when SpellBlock events happen:

1. **Round Opens** (16:05 UTC / 10:05am CT daily)
   - Posts letters for the new round
   - Tags @base

2. **Seed Revealed** (00:05 UTC / 6:05pm CT daily)
   - Reminds players commit phase ended
   - Warns about unrevealed forfeiture

3. **Round Finalized** (04:05 UTC / 10:05pm CT daily)
   - Announces results are in
   - Previews next round timing

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

# Seed revealed (00:05 UTC / 6:05pm CT daily)
5 0 * * * ~/clawd/projects/clawdia-spellblock/social/post-seed-revealed.sh >> ~/clawd/logs/spellblock-social.log 2>&1

# Round finalized (04:05 UTC / 10:05pm CT daily)
5 4 * * * ~/clawd/projects/clawdia-spellblock/social/post-round-finalized.sh >> ~/clawd/logs/spellblock-social.log 2>&1

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
- **Commit closes**: 00:00 UTC (8 hours later)
- **Reveal closes**: 04:00 UTC (4 hours later)
- **Next round**: 16:00 UTC (12 hours later)

## Spells

| ID | Name | Rule |
|----|------|------|
| 0 | Veto | Word cannot contain vetoed letter |
| 1 | Anchor | Word must start with anchor letter |
| 2 | Seal | Word must end with seal letter |
| 3 | Gem | Word must have adjacent identical letters (like "coffee") |
