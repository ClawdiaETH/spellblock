# SpellBlock Contract Timing Update

## Summary
Updated SpellBlock contract timing from 8hr commit + 4hr reveal to **16hr commit + 7h45m reveal** phases.

## Schedule Changes

### Old Timing (12 hours total)
- **Commit Phase:** 8 hours
- **Reveal Phase:** 4 hours  
- **Total:** 12 hours

### New Timing (23h45m total)
- **Commit Phase:** 16 hours (16:00 UTC → 08:00 UTC next day)
- **Reveal Phase:** 7 hours 45 minutes (08:00 UTC → 15:45 UTC)
- **Buffer:** 15 minutes (15:45-16:00 UTC for finalization)
- **Next Round:** Opens at 16:00 UTC

## Daily Schedule (UTC)
- **16:00:** Round opens, commit phase starts
- **08:00 (next day):** Commits close, spell/ruler revealed, reveal phase starts
- **15:45 (next day):** Reveals close
- **15:45-16:00:** 15-minute buffer for finalization
- **16:00:** New round opens

## Files Modified

### Contract Code
- `src/SpellBlockGame.sol`
  - Line 198-199: Updated timing constants in `openRound()` function
  - Line 540-547: Fixed letter pool validation to handle uppercase letters
  - Updated comment to reflect new schedule

### Test Code  
- `test/SpellBlockGame.t.sol`
  - Line 123-124: Updated timing assertions in `testOpenRound()`
  - Line 179: Updated commit deadline test (9h → 17h)
  - Line 208: Updated reveal phase warp (8h+1 → 16h+1)
  - Line 674: Updated `_moveToRevealPhase()` helper (8h+1 → 16h+1)
  - Line 700: Updated `_moveToFinalizationPhase()` helper (12h+1 → 24h)
  - All instances: Changed letter pool from lowercase to uppercase ("abcdefgh" → "ABCDEFGH")

## Test Results
✅ **All 26 tests passing**
- 17 tests in `SpellBlockGame.t.sol`
- 9 tests in `LetterPoolEncoding.t.sol`

## Deployment Plan

### Critical Considerations
⚠️ **This creates a NEW contract** (Solidity contracts are immutable)

### Old Contract
- **Address:** `0x4b8bf9004Ba309EB0169a97821D0eD993AF37961`
- **Status:** Remains deployed with old timing (8h/4h)
- **Action:** Complete Round 3 on old contract before migration

### New Contract
- **Status:** Ready for deployment
- **Timing:** 16h commit + 7h45m reveal
- **Action:** Deploy to Base mainnet, update frontend config

### Migration Strategy
1. **Finalize Round 3** on old contract (let it complete naturally)
2. **Deploy new contract** to Base mainnet
3. **Update frontend** `src/config/contracts.ts` with new address
4. **Start Round 4** on new contract with new timing

### Frontend Update Required
File: `~/clawd/projects/spellblock-frontend/src/config/contracts.ts`
- Update SpellBlock contract address to new deployment address
- Commit and push changes
- Frontend will automatically use new timing from contract state

## Deployment Command
```bash
cd ~/clawd/projects/spellblock/contracts

# Deploy to Base mainnet
forge script script/Deploy.s.sol:DeploySpellBlock \
  --rpc-url https://mainnet.base.org \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify

# Note the deployed contract address from output
```

## Verification Checklist
- [x] Contract timing updated (16h commit + 7h45m reveal)
- [x] Comments updated to reflect new schedule
- [x] All tests passing (26/26)
- [ ] Review changes with team
- [ ] Deploy to Base mainnet
- [ ] Verify deployment on BaseScan
- [ ] Update frontend config with new address
- [ ] Test Round 4 opening with new timing
- [ ] Document new contract address

## Notes
- Contracts are immutable - cannot modify old contract
- Old contract will remain functional with old timing
- Migration is a clean cut-over (no token migration needed at contract level)
- Round 3 participants can still claim rewards from old contract
- New contract starts fresh with Round 1 (or configured round number)

---
**Created:** 2026-02-06  
**Status:** ✅ Code updated, tests passing, ready for deployment review
