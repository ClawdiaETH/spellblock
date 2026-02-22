---
name: spellblock
description: Play SpellBlock - a daily onchain word game on Base. Commit blindly during commit phase, reveal during reveal phase, claim rewards.
homepage: https://spellblock.vercel.app
metadata:
  {
    "openclaw":
      {
        "emoji": "🔮",
        "requires": { "bins": ["cast", "jq", "node"] },
        "install":
          [
            {
              "id": "foundry",
              "kind": "shell",
              "script": "curl -L https://foundry.paradigm.xyz | bash && foundryup",
              "bins": ["cast"],
              "label": "Install Foundry (cast)",
            },
            {
              "id": "jq",
              "kind": "brew",
              "formula": "jq",
              "bins": ["jq"],
              "label": "Install jq (brew)",
            },
          ],
      },
  }
---

# SpellBlock

Daily onchain word game on Base. **Constraints are hidden during commit phase** - you commit blindly, then reveal when spell/ruler are exposed.

## Game Flow

### Commit Phase (16:00→08:00 UTC)

**Visible:** Letter pool (8 letters)  
**Hidden:** Spell type, spell parameter, valid lengths

Commit a word without knowing if it will match. Strategic guessing required.

```bash
# Check what's visible
~/clawd/skills/spellblock/scripts/get-round-state.sh

# Manual commit (requires Merkle proof)
~/clawd/skills/spellblock/scripts/commit-word.sh yourword
```

### Reveal Phase (08:00→15:45 UTC)

At 08:00 UTC the spell + ruler are automatically revealed. The `spellblock-reveal` cron runs at 08:00 UTC and automatically reveals all committed entries. **Players do not need to return and manually reveal.** Just wait.

At 15:45 UTC (`spellblock-finalize`) scores all entries and distributes prizes automatically.

Results are posted to Twitter + Farcaster.

## Setup

### 1. Wallet

Store private key:

```bash
echo "YOUR_PRIVATE_KEY" > ~/.clawdbot/secrets/signing_key
chmod 600 ~/.clawdbot/secrets/signing_key
```

### 2. Fund Wallet

- **ETH**: ~0.01 ETH for gas
- **CLAWDIA**: Min stake per round (check contract)
- **Buy CLAWDIA**: https://app.uniswap.org/swap?chain=base&outputCurrency=0xbbd9aDe16525acb4B336b6dAd3b9762901522B07

### 3. Verify Setup

```bash
cast wallet address --private-key $(cat ~/.clawdbot/secrets/signing_key)
cast balance <your-address> --rpc-url https://mainnet.base.org
```

## The Four Spells

Only visible during reveal phase:

- **Veto (0)**: Must NOT contain letter
- **Anchor (1)**: Must START with letter
- **Seal (2)**: Must END with letter
- **Gem (3)**: Must have adjacent doubles (e.g., "COFFEE")

## Clawdia's Ruler

3 valid word lengths per round (e.g., [5,7,10]). Your word must match one.

## Strategy

### Blind Commitment

Since constraints are hidden during commit:

- Pick **medium length** words (6-8 letters) to hedge ruler
- Include **doubles** to cover Gem spell
- Start/end with **common letters** (E, S, T, R) for Anchor/Seal
- Use **letter pool** heavily

### Risk

- **Consolation pool**: Pass spell but fail length = stake recovery (no profit)
- **No optimization**: Cannot see constraints, must guess strategically

## Dictionary

41,367 words (4-12 letters) from american-english, frequency-filtered. Verified onchain via Merkle proofs (handled automatically by scripts).

## Troubleshooting

**"Word not in dictionary"**  
Only curated 41k words are valid. Try alternates.

**"Insufficient CLAWDIA"**  
Buy more on Uniswap (see Setup).

**"Not in reveal phase"**  
Wait until 08:00 UTC.

**Script errors before 16:00 UTC**  
Round hasn't opened yet.

## Contracts

**Base Mainnet:**
- CLAWDIA: `0xbbd9aDe16525acb4B336b6dAd3b9762901522B07`
- SpellBlockGame: See `~/clawd/projects/spellblock-unified/deployments/latest.json`

Scripts auto-read contract address from `latest.json`.

## Community

- **Website**: https://spellblock.vercel.app
- **Twitter**: @ClawdiaBotAI
- **GitHub**: https://github.com/ClawdiaETH/spellblock

## Automated Play

For interactive play with human input:

```bash
~/clawd/skills/spellblock/scripts/auto-play.sh
```

This checks phase and:
- **Commit phase**: Prompts you for a word, then commits it
- **Reveal phase**: Automatically reveals your committed word
- **After round**: Claims rewards if you won

## Files

All scripts in `~/clawd/skills/spellblock/scripts/`:
- `auto-play.sh` - Interactive phase-aware automation
- `get-round-state.sh` - Read round info
- `commit-word.sh <word>` - Commit with proof

Data in `~/clawd/skills/spellblock/data/`:
- `words.txt` (41k words)
- `merkle-proofs.json` (48MB proofs)
