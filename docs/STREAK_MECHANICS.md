# SpellBlock Streak Mechanics Documentation

**Last Updated:** 2026-02-06  
**Contract Version:** SpellBlockGame v3

---

## Overview

SpellBlock features a **daily play streak bonus** that rewards consistent participation. This is NOT a win streak — players maintain their streak by revealing a word each day, regardless of whether they win or lose.

---

## Streak Mechanics

### Tracking
- **Per-Player Storage:** Each player has their own streak counter
- **Storage Variables:**
  - `streakCount[address]`: Current streak count for each player
  - `lastParticipatedRound[address]`: Last round ID where player revealed

### When Streak Updates
- **Trigger:** Streak updates when `reveal()` function is called (line 398 in contract)
- **Timing:** During reveal phase (NOT commit phase)
- **Comment from contract:** `"participation counts regardless of outcome"`

### Streak Progression
```solidity
function _updateStreak(address player) internal {
    if (lastParticipatedRound[player] == currentRoundId - 1) {
        streakCount[player]++;  // Played previous round → increment
    } else if (lastParticipatedRound[player] != currentRoundId) {
        streakCount[player] = 1;  // Skipped rounds → reset to 1
    }
    lastParticipatedRound[player] = currentRoundId;
}
```

**Rules:**
1. If you played the previous round (roundId - 1): Streak increments by 1
2. If you skipped any rounds: Streak resets to 1
3. Streak is updated ONLY when you reveal your word

---

## Multiplier Tiers

| Days | Multiplier | Bonus |
|------|-----------|-------|
| 0-2  | 1.00×     | 0%    |
| 3-6  | 1.10×     | +10%  |
| 7-13 | 1.25×     | +25%  |
| 14+  | 1.50×     | +50%  |

```solidity
function _getStreakMultiplier(address player) internal view returns (uint256) {
    uint256 streak = streakCount[player];
    if (lastParticipatedRound[player] == currentRoundId - 1) {
        streak++;  // Preview next streak value
    } else if (lastParticipatedRound[player] != currentRoundId) {
        streak = 1;  // Reset if skipped
    }

    if (streak >= 14) return 150;  // 1.50×
    if (streak >= 7) return 125;   // 1.25×
    if (streak >= 3) return 110;   // 1.10×
    return 100;  // 1.00× (no bonus)
}
```

---

## How Multiplier is Applied

### Effective Score Calculation
```solidity
// In reveal() function (lines 384-390)
if (passesSpell) {
    uint256 multiplier = _getStreakMultiplier(msg.sender);
    c.effectiveScore = uint16((uint256(c.wordLength) * multiplier) / 100);
} else {
    c.effectiveScore = 0;  // Failed spell = zero score
}
```

**Key Points:**
1. Base score = word length (1 point per letter)
2. Multiplier is applied ONLY if word passes the spell check
3. If word fails spell check: effectiveScore = 0 (but streak still updates!)
4. Effective score determines payout share among winners

### Example
- Player has 7-day streak (1.25× multiplier)
- Reveals 8-letter word that passes both spell and ruler
- Effective score = 8 × 1.25 = 10 points
- Payout proportional to 10 points vs other winners' scores

---

## Edge Cases

### Case 1: Commit but Never Reveal
**Result:** Streak does NOT update (loses streak progress)
- `_updateStreak()` is only called in `reveal()` function
- Committing without revealing = skipping the round for streak purposes

### Case 2: Reveal but Fail Spell Check
**Result:** Streak DOES update (maintains/increments streak)
- Streak updates regardless of spell check result (line 398 comment confirms this)
- Score will be 0, but streak continues

### Case 3: Reveal but Fail Ruler Length
**Result:** Streak DOES update (maintains/increments streak)
- Becomes consolation winner (eligible for 10% pool)
- Streak bonus still applied to score calculation

### Case 4: Multiple Consecutive Days
**Result:** Streak increments each day
- Day 1: streak = 1 (no bonus)
- Day 2: streak = 2 (no bonus)
- Day 3: streak = 3 (1.10× bonus starts)
- Day 7: streak = 7 (1.25× bonus)
- Day 14: streak = 14 (1.50× bonus caps)

### Case 5: Skip a Day
**Result:** Streak resets to 1
- If lastParticipatedRound != currentRoundId - 1
- Must rebuild from day 1

---

## Contract References

### State Variables
```solidity
// Line 78-79
mapping(address => uint256) public streakCount;
mapping(address => uint256) public lastParticipatedRound;
```

### Key Functions
- **reveal()** (line 351): Triggers streak update
- **_updateStreak()** (line 685): Updates streak counter
- **_getStreakMultiplier()** (line 671): Calculates multiplier based on streak

### Events
```solidity
// Line 109 - CommitSubmitted event includes streak
event CommitSubmitted(
    uint256 indexed roundId, 
    address indexed player, 
    uint256 stake, 
    uint256 timestamp, 
    uint256 streak
);
```

---

## UI Terminology

**Correct:** "Play streak bonus" or "Daily streak bonus"  
**Incorrect:** "Win streak bonus"

The frontend has been updated to reflect this (page.tsx line 259).

---

## Summary

✅ Streak is based on **participation** (revealing), not winning  
✅ Streak increments during reveal phase  
✅ Resets if you skip a day (don't play previous round)  
✅ Multiplier tiers: 3 days (1.10×), 7 days (1.25×), 14 days (1.50×)  
✅ Applied only when word passes spell check (but streak updates regardless)  
✅ Commit without reveal = lose your streak  
✅ Reveal without winning = keep your streak  

---

**Contract Location:** `~/clawd/projects/spellblock/contracts/src/SpellBlockGame.sol`  
**Frontend Updated:** `~/clawd/projects/spellblock-frontend/src/app/page.tsx`
