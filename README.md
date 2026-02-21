# SpellBlock 🔮

Daily onchain word game on Base. Make a word from 8 letters, survive two secret filters, stake $CLAWDIA to win.

**Live at:** [spellblock.app](https://spellblock.app)

---

## How to play

1. **Reply** to the daily round tweet/cast with your word
2. **Bot validates** it instantly — letters must come from the pool
3. **Pay link** sent back — stake min 1,000,000 $CLAWDIA at [spellblock.app/enter](https://spellblock.app/enter)
4. **Spell drops** at commit deadline — your word must survive both filters
5. **Best surviving words** split the pot

Two filters determine winners:
- **Letter pool** — word uses only the 8 given letters (unlimited repeats)
- **Spell** — a secret rule revealed at deadline (Anchor, Seal, Veto, or Gem)

---

## Architecture

```
Twitter/FC reply
      ↓
Mention poller (every 15 min, no LLM)
      ↓
Validate word (letter pool + dictionary)
      ↓
Reply with payment link → spellblock.app/enter
      ↓
Player stakes CLAWDIA (min 1M)
      ↓
Spell revealed at commit deadline
      ↓
Bot scores entries, distributes prizes via @bankrbot
```

### Key contracts (Base mainnet)

| Contract | Address |
|---|---|
| SpellBlockGame | `0x43F8658F3E85D1F92289e3036168682A9D14c683` |
| SpellRegistry | `0xd6cd3f23194D14Bba28BA5fd2b2814dCFFAA897d` |
| SpellEngine | `0x4Ee325a1F4A1c715c40D729f23CE1507e5dD40Cf` |
| DictionaryVerifier | `0x911731EFA7dD3d0d666e9803502f0FBF94d0BF97` |
| $CLAWDIA token | `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07` |

### Repo layout

```
bot/                  # Cron scripts (pure Node.js, zero LLM)
  lib/
    validate.mjs      # Word validation: pool, dict, spell, scoring
    db.mjs            # Neon DB helpers
  spellblock-mentions.mjs       # Twitter reply poller
  spellblock-fc-mentions.mjs    # Farcaster reply poller
  spellblock-round-open.mjs     # Post round tweet/cast, seed DB
  spellblock-finalize.mjs       # Score entries, distribute prizes

contracts/            # Foundry — SpellBlockGame, SpellEngine, SpellRegistry
database/             # SQL migrations
frontend/             # Next.js — spellblock.app
  src/app/enter/      # Payment page (wallet connect + CLAWDIA transfer)
scripts/              # On-chain lifecycle: open-round.sh, reveal, finalize
social/               # Social post scripts (post-round-opened.sh, etc.)
docs/                 # Deployment guides, specs, encoding reference
```

---

## Daily round schedule (UTC)

| Time | Event |
|---|---|
| 16:00 | `open-round.sh` — `openRound()` on contract |
| 16:05 | `spellblock-round-open.mjs` — post tweet + cast, seed DB |
| every 15m | Mention pollers — validate replies, send payment links |
| 08:00+1d | `reveal-seed-and-ruler.sh` — spell revealed on-chain |
| 15:45+1d | `finalize-round.sh` — `finalizeRound()` on contract |
| 15:55+1d | `spellblock-finalize.mjs` — score DB, pay winners |

---

## Secrets (never commit)

Round secrets files are gitignored: `**/ROUND_*_SECRETS_*.txt`, `*-preview.json`

All API keys and private keys are in macOS Keychain. See `~/clawd/TOOLS.md`.

---

## Development

```bash
# Install
cd frontend && npm install
cd ../contracts && forge install
cd ../bot && npm install

# Local frontend
cd frontend && npm run dev

# Run a bot script manually
node bot/spellblock-mentions.mjs

# Contract compile
cd contracts && forge build

# Deploy
cd contracts && PRIVATE_KEY=$(get-secret.sh signing_key) forge script script/Deploy.s.sol --broadcast
```

---

Built by [@ClawdiaBotAI](https://x.com/ClawdiaBotAI) 🐚
