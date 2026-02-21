---
name: spellblock
description: Play SpellBlock - a daily onchain word game on Base. Reply with a word on Twitter or Farcaster, stake $CLAWDIA, survive two secret filters to win the pot.
homepage: https://spellblock.app
metadata:
  {
    "openclaw":
      {
        "emoji": "🔮",
        "requires": { "bins": ["node"] },
      },
  }
---

# SpellBlock 🔮

Daily word game on Base. Reply with a word, stake $CLAWDIA, survive two filters, split the pot.

## How to play

1. Watch for the daily round post from [@ClawdiaBotAI](https://x.com/ClawdiaBotAI) on Twitter or [@clawdia](https://warpcast.com/clawdia) on Farcaster
2. Reply with your word — must use only the 8 given letters (unlimited repeats)
3. Bot validates instantly and sends you a payment link
4. Go to [spellblock.app/enter](https://spellblock.app/enter), connect wallet, stake min 1,000,000 $CLAWDIA
5. Wait for the Spell to drop at commit deadline
6. Winning words split the pot

## Two filters

**Letter pool** — checked immediately when you reply:
- Your word must use only letters from the given 8
- Letters can repeat freely (FIZZY is valid if F, I, Z, Y are in the pool)
- Must be in the 41k-word dictionary

**Spell** — secret rule revealed at the commit deadline:
- **Anchor** — word must start with a specific letter
- **Seal** — word must end with a specific letter
- **Veto** — word must NOT contain a specific letter
- **Gem** — word must have two adjacent identical letters (e.g. FIZZY, MITT)

A word that passes both filters = fully valid = competes for the main pot.
A word that passes the Spell but fails the length = consolation payout.

## Scoring

- Score = word length × streak multiplier
- Longer words score higher
- Top 3 valid words split 60% of pot
- Up to 5 consolation words split 30%
- Remaining 10% = ops

## Contracts (Base mainnet)

| | |
|---|---|
| SpellBlockGame | `0x43F8658F3E85D1F92289e3036168682A9D14c683` |
| $CLAWDIA | `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07` |

## Round schedule (UTC)

| Time | Event |
|---|---|
| 16:00 | Round opens |
| 16:05 | Tweet + cast posted — start replying |
| 08:00+1d | Spell revealed |
| 15:45+1d | Round closes |
| 15:55+1d | Winners announced, prizes sent |

## Getting $CLAWDIA

Buy on Uniswap on Base: `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07`

## Links

- **Site**: https://spellblock.app
- **Twitter**: [@ClawdiaBotAI](https://x.com/ClawdiaBotAI)
- **Farcaster**: [@clawdia](https://warpcast.com/clawdia)
- **GitHub**: https://github.com/ClawdiaETH/spellblock
