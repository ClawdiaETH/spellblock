# SpellBlock Automated Round Lifecycle

## Overview

SpellBlock uses a **single reusable contract** with sequential rounds. No new deployment needed - just call `openRound()` daily.

**Contract**: `0xcc6033675b338005c6f1322feb7e43c5ed612257` (Base mainnet)

## Daily Schedule (Automated)

| Time (CST) | Time (UTC) | Action | Script |
|------------|------------|--------|--------|
| **03:00 AM** | **08:00** | Reveal seed + ruler | `reveal-seed-and-ruler.sh` |
| **10:45 AM** | **15:45** | Finalize round | `finalize-round.sh` |
| **11:00 AM** | **16:00** | Open next round | `open-round.sh` |

## Cron Jobs Created

✅ **spellblock-reveal** - `0 3 * * *` (03:00 AM CST daily)
✅ **spellblock-finalize** - `45 10 * * *` (10:45 AM CST daily)  
✅ **spellblock-open** - `0 11 * * *` (11:00 AM CST daily)

All jobs log to `~/clawd/logs/spellblock-*.log`

## Scripts

### `open-round.sh`
- Generates random seed, ruler salt, letter pool
- Computes seed hash and ruler commitment
- Calls `openRound()` with parameters
- Saves secrets to `contracts/ROUND_N_SECRETS_*.txt`

**Runs**: 16:00 UTC (11:00 AM CST) daily

### `reveal-seed-and-ruler.sh`
- Auto-detects current round and secrets file
- Verifies operator wallet
- Calls `revealSeedAndRuler()` with seed/lengths/salt
- Makes spell + ruler visible to all players

**Runs**: 08:00 UTC (03:00 AM CST) daily

### `finalize-round.sh`
- Calls `finalizeRound()` to distribute rewards
- Winners get share of 90% pot
- Consolation recovers stakes (no profit)
- Tokens burned from failed spells

**Runs**: 15:45 UTC (10:45 AM CST) daily

## Round Lifecycle

```
16:00 UTC - Round opens
          ↓ (16 hours)
08:00 UTC - Spell + Ruler revealed
          ↓ (7h 45m)
15:45 UTC - Round finalizes
          ↓ (15 min buffer)
16:00 UTC - Next round opens
```

## Current Issue: Round 2

**Problem**: Round 2 seed/ruler NOT revealed (33+ minutes overdue)

**Cause**: Operator wallet mismatch
- Contract operator: `0x84d5e34Ad1a91cF2ECAD071a65948fa48F1B4216`
- Current signing_key: `0xf17b5dD382B048Ff4c05c1C9e4E24cfC5C6adAd9`

**Solution**: 
1. Use deployment wallet to reveal manually, OR
2. Call `setOperator()` to update operator address, OR
3. Restore deployment key temporarily

**After fixing**: Automation will handle all future rounds!

## Secrets Files

Each round generates a secrets file:
```
contracts/ROUND_N_SECRETS_YYYYMMDD_HHMM.txt
```

Contains:
- Seed (for randomness)
- Ruler salt (for commitment)
- Valid lengths (Clawdia's Ruler)
- Letter pool (8 unique letters)

**Critical**: Keep these secret until reveal time!

## Prevention

For Round 3+:
1. ✅ Automation handles everything
2. ✅ Same wallet for all operations
3. ✅ Secrets auto-generated and saved
4. ✅ Logs capture any errors

## Monitoring

Check cron status:
```bash
# View all cron jobs
cron action=list | jq '.jobs[] | select(.name | contains("spellblock"))'

# Check logs
tail -f ~/clawd/logs/spellblock-*.log
```

## Manual Override

If automation fails, run scripts manually:
```bash
# Open new round
~/clawd/projects/spellblock-unified/scripts/open-round.sh

# Reveal seed/ruler
~/clawd/projects/spellblock-unified/scripts/reveal-seed-and-ruler.sh

# Finalize
~/clawd/projects/spellblock-unified/scripts/finalize-round.sh
```

## Next Steps for Round 2

1. **Immediate**: Reveal Round 2 manually with operator wallet
2. **Future**: Automation handles Round 3+ seamlessly
3. **Frontend**: Will display correct data once revealed

---

**Status**: ✅ Automation ready for Round 3+  
**Blocker**: Round 2 needs manual reveal (operator wallet issue)
