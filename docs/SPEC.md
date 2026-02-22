# SpellBlock — Comprehensive Overview & Implementation Plan (v3)

## Changelog from v2

- **Live Pot Display** — Real-time pot visualization during commit phase (from ClawFomo analysis)
- **Countdown Theater** — Final hour before commit close treated as a spectacle event
- **Anonymous Activity Feed** — Live commit feed showing wallet, stake, timestamp without word leakage
- **Visible Burn Counter** — Persistent, cumulative burn tracker as a marketing surface
- **Per-Round Staker Payouts** — Staker rewards credited visibly after each round, not batched
- **Jackpot Rounds** — Pot-threshold bonus mechanic seeded by operations treasury
- **Expanded Smart Contract Architecture** — Full interface definitions, storage layouts, and function signatures
- **Frontend Engagement Layer** — Detailed spec for the presentation layer that drives urgency

---

## Overview

**SpellBlock** is a commit–reveal, wager-based word game built on block-derived randomness, operated by **Clawdia** and denominated in **$CLAWDIA**.

Each round presents players with a shared pool of letters. Players commit a word and a $CLAWDIA stake without knowing which *Spell* (rule) will apply. After commits close, the Spell is revealed, players reveal their words, and payouts are distributed based on word quality and conviction.

Skill is expressed as **choosing a strong word under uncertainty and backing it with conviction**.

One round runs per day. Every round is an event.

---

## Core Game Loop

1. Round opens (same time daily)
2. Letter pool is published
3. **Commit phase (8 hours)**
   - Players submit a commitment hash + $CLAWDIA stake
   - Live pot counter and anonymous activity feed visible to all
   - Final hour triggers "Countdown Theater" mode
4. Commit phase closes
5. Spell is revealed
6. **Reveal phase (automated)**
   - Bot automatically reveals all committed words + salts at 08:00 UTC
   - Live leaderboard updates as reveals land
7. Validation and scoring
8. Payouts executed (including per-round staker distribution)
9. Treasury fee distributed (burn / stakers / operations)
10. Burn counter incremented globally

---

## Round Cadence

- **One round per day**, every day
- Fixed daily schedule anchored to a consistent UTC time
  - Round opens: **16:00 UTC**
  - Commit deadline: **00:00 UTC** (8-hour commit window)
  - **Final Hour** begins: **23:00 UTC** (Countdown Theater activates)
  - Reveal deadline: **04:00 UTC** (4-hour reveal window)
  - Finalization & payouts: immediately after reveal deadline
- Predictability builds habit; habit builds retention
- Clawdia announces the round on socials at open

---

## Token Integration — $CLAWDIA as Native Currency

- All wagers denominated in **$CLAWDIA**
- Minimum stake floor: **1,000 $CLAWDIA** (prevents dust spam and consolation pool sybils)
- No maximum stake (conviction is part of the game)
- Optional: ETH entry path that auto-swaps to $CLAWDIA on commit (captures LP volume)

---

## Round Parameters

- `roundId`
- `startTime` (fixed daily, 16:00 UTC)
- `commitDeadline` (00:00 UTC)
- `revealDeadline` (04:00 UTC)
- `letterPool` (fixed size, e.g. 10 letters)
- `spellId` (hidden until commit closes)
- `spellParam` (if applicable)
- `treasuryFeeBps` (300 = 3%)
- `minStake` (1,000 $CLAWDIA)
- `jackpotThreshold` (500,000 $CLAWDIA — triggers Jackpot Round)
- `jackpotBonusBps` (1000 = 10% of threshold, seeded from operations)
- `payoutSplit`
  - 60% winners (passed BOTH spell + ruler)
  - 30% consolation (passed spell, failed ruler — capped at stake, no profit)
  - 10% ops
- `maxWinnersValid` — dynamic (see Dynamic Winner Slots)
- `maxWinnersConsolation` — dynamic (see Dynamic Winner Slots)

---

## Word Validity Rules

A revealed word is **eligible** if:

- It exists in the canonical dictionary
- It can be formed from the letter pool (respecting multiplicity)
- It satisfies the revealed Spell

Words that **pass the Spell but fail the Ruler** (word length not in valid set) are eligible for the consolation pool (see Consolation Pool Rules). Words that fail the Spell are not eligible for consolation — their stake is burned into the pot.

---

## Scoring & Tie-Breakers

- Primary score: word length
- Streak multiplier applied (see Streaks)
- Tie-breakers, in order:
  - Higher stake
  - Earlier commit timestamp
  - Even split if still tied

---

## Payout Rules

### Treasury Fee — 3% of all wagers, split into three buckets:

| Bucket | Share | Purpose |
|--------|-------|---------|
| Burn | 1% | Deflationary pressure tied to game activity |
| Staker rewards | 1% | Distributed to $CLAWDIA stakers per-round — visible, not batched |
| Operations | 1% | Funds Clawdia's wallet — API costs, prize pool seeding, Jackpot Round bonuses |

### Pot Distribution (remaining 97%):

- **60%** to top valid submissions (passed BOTH spell + ruler)
- **30%** to consolation submissions (passed spell, failed ruler — capped at stake, no profit)
- **10%** ops reserve (gas, fees, operations)
- Players who fail to reveal **forfeit their entire stake** to the pot

### Per-Round Staker Distribution (v3 — new)

The 1% staker cut is distributed immediately at finalization, not accumulated in a drip contract. Each round's staker reward is a discrete, visible event:

- At finalization, the staker reward amount is calculated and pushed to the `StakerRewardDistributor` contract
- Stakers can claim their pro-rata share at any time
- The frontend displays: "Round #142 distributed 12,400 $CLAWDIA to stakers"
- This makes holding feel active — every round pays you

---

## Consolation Pool Rules

The consolation pool exists to reward players who submitted strong words but got unlucky on the spell. It is **not** a second prize tier to be gamed.

**Anti-gaming rule:** Consolation payouts are **capped at returning the player's original stake**. No profit from spell failure. If the consolation pool exceeds the sum of eligible players' stakes, excess rolls into the next round's pot.

This ensures:
- Unlucky players aren't punished for trying
- Intentional spell-failure is never +EV
- The valid winner pool remains the only path to profit

---

## The Five Spells

All spells are deterministic and verifiable.

### 1. Veto
One letter from the pool becomes forbidden.

- Invalid if the word contains the vetoed letter
- Parameter: `vetoLetter` (chosen from the pool at reveal)

### 2. Anchor
The word must start with a specific letter.

- Invalid if the first letter does not match
- Parameter: `anchorLetter` (chosen from the pool at reveal)

### 3. Seal
The word must contain a specific letter at least once.

- Invalid if the letter does not appear
- Parameter: `sealLetter` (chosen from the pool at reveal)

### 4. Spine
The word must contain a structural "spine".

**Definition:** The word must contain at least one pair of adjacent identical letters.

Examples:
- Valid: `letter`, `coffee`, `still`
- Invalid: `crate`, `sound`

- No parameters required

### 5. Clawdia's Claw
A custom constraint selected by Clawdia before the round opens.

- Clawdia commits `keccak256(roundId, constraintType, constraintParam, salt)` when the round opens
- Constraint revealed after commit phase closes (same flow as other spells)
- Constraint types are **whitelisted** onchain to bound the design space

**Whitelisted constraint types (initial set):**

| Type | Description | Example |
|------|-------------|---------|
| `MIN_LENGTH` | Word must be ≥ N letters | N = 7 |
| `MAX_LENGTH` | Word must be ≤ N letters | N = 5 |
| `CONTAINS_SUBSTRING` | Word must contain a specific substring | "an" |
| `ENDS_WITH` | Word must end with a specific letter | "s" |
| `NO_VOWEL` | Word cannot contain a specific vowel | "e" |
| `CATEGORY` | Word must belong to a semantic category | "animal" (requires category Merkle tree) |

**Narrative purpose:** Clawdia is the dealer. She picks the constraint, taunts players during commit phase with cryptic hints, and roasts/celebrates after results. This makes the game feel alive and gives the agent a daily content hook.

**Trust model:** Same commit-reveal as other spells. Clawdia commits before anyone plays, so she can't adapt to submissions. Onchain verifiable.

---

## Spell Selection

- Spells 1–4 are selected via randomness (see Randomness section)
- Spell 5 (Clawdia's Claw) is selected by Clawdia at her discretion
- Distribution target: Spells 1–4 each appear ~20% of rounds, Clawdia's Claw ~20%
- Clawdia can override distribution for narrative purposes (e.g. running Claw on significant days)

---

## Jackpot Rounds (v3 — new)

When the total committed pot for a round crosses a configurable threshold, Clawdia declares a **Jackpot Round** and seeds additional $CLAWDIA from the operations treasury.

### Mechanics

- `jackpotThreshold`: configurable per-round (initial: 500,000 $CLAWDIA)
- `jackpotBonusBps`: percentage of threshold added as bonus (initial: 10% = 50,000 $CLAWDIA bonus)
- Bonus is funded from the operations treasury wallet
- Bonus is added to the pot *before* the treasury fee is calculated (so the treasury also takes its 3% cut of the bonus — self-sustaining)
- Jackpot status is determined mid-round as commits arrive — it can only activate, never deactivate

### Onchain

- The `SpellBlockGame` contract tracks `totalStaked` per round in real-time
- When `totalStaked >= jackpotThreshold`, the contract emits `JackpotTriggered(roundId, bonusAmount)`
- Clawdia's operator wallet calls `seedJackpotBonus(roundId)` to transfer bonus $CLAWDIA into the round's pot
- The bonus transfer is permissioned to the operator address and can only fire once per round
- If the operator fails to seed (e.g. insufficient balance), the round proceeds normally — no bonus, no revert

### Narrative

- Clawdia detects the threshold crossing and posts immediately: "This round just crossed 500K $CLAWDIA — I'm adding 50K from the vault. Good luck 🐾"
- Jackpot rounds get special visual treatment on the frontend (gold border, pulsing pot, distinct color palette)
- Creates a positive feedback loop: big participation → bigger pot → Clawdia sweetens it → more participation
- No Ponzi mechanics — it's the house sweetening the pot when the table gets hot

---

## Streaks

Consecutive daily participation (commit + reveal, regardless of win/loss) earns a scoring multiplier:

| Consecutive Days | Multiplier |
|-----------------|------------|
| 1–2 | 1.0x |
| 3–6 | 1.1x |
| 7–13 | 1.25x |
| 14+ | 1.5x |

- Tracked onchain as a simple counter per player
- Resets to 0 on any missed round
- Applied as a **score multiplier**, not a payout multiplier (doesn't break economics)
- Effective score = `wordLength * streakMultiplier`
- Tie-breaking still falls to stake → timestamp after multiplied score

---

## Seasons

- **Season length:** 14 days (2 weeks)
- Cumulative leaderboard tracking total score across all rounds in a season
- Season score = sum of (effective score × placement bonus) per round

### Season Rewards

- Funded by a dedicated slice of treasury (configurable, e.g. 20% of operations bucket)
- Top 3 season performers receive $CLAWDIA prize pool
- Optional: commemorative NFTs for season champions
- Clawdia announces season standings daily, does full recap at season end

---

## Dynamic Winner Slots

Winner count scales with participation rather than being fixed:

```
maxWinnersValid = max(3, floor(numReveals * 0.10))
maxWinnersConsolation = max(1, floor(numReveals * 0.05))
```

- Calculated at finalization based on actual reveal count
- Bounded, deterministic, adapts to participation
- A 10-player round: 3 valid winners, 1 consolation
- A 200-player round: 20 valid winners, 10 consolation

---

## Live Engagement Layer (v3 — new)

The presentation layer is as important as the game mechanics. Every element below is designed to create urgency, social proof, and competitive anxiety — stolen from ClawFomo's energy, not its mechanics.

### Live Pot Display

The total $CLAWDIA pot is the centerpiece of the frontend during commit phase.

- Displayed prominently, updates in real-time as new commits land
- Visual treatment escalates as the pot grows:
  - < 100K $CLAWDIA: standard display
  - 100K–250K: warm glow
  - 250K–500K: pulsing animation
  - 500K+ (Jackpot threshold): gold treatment, particle effects
- Pot counter persists across all pages during an active round
- Shows both raw $CLAWDIA amount and approximate USD equivalent

### Anonymous Activity Feed

A live scrolling feed during commit phase. Reveals social proof and competitive stakes without leaking word choices.

Each entry shows:
- Truncated wallet address (e.g. `0x4a2...8f3`)
- Stake amount
- Timestamp
- Player's current streak (if > 2 days)

Example feed entries:
```
0x4a2...8f3 committed 50,000 $CLAWDIA (🔥 7-day streak)     2m ago
0xb91...2c7 committed 5,000 $CLAWDIA                         4m ago
0x1fe...a40 committed 120,000 $CLAWDIA (🔥 14-day streak)    6m ago
```

This feed is constructed from `CommitSubmitted` events. No word information is leaked.

### Countdown Theater

The final hour before commit close (23:00–00:00 UTC) gets special treatment:

- Frontend transitions to a "Final Hour" visual mode (darker palette, urgency cues)
- Countdown timer becomes the dominant UI element
- Clawdia posts escalating social content during this window
- Activity feed gets more prominent
- Optional: sound/notification for last 5 minutes if user has the page open

### Cumulative Burn Counter

A persistent, always-visible counter showing total $CLAWDIA burned by SpellBlock across all rounds.

- Displayed in the site header/footer
- Updates after each round's finalization
- Format: "🔥 SpellBlock has burned 2,412,600 $CLAWDIA"
- Doubles as a marketing surface — screenshot-friendly, tweetable
- Data sourced from `TokensBurned` events across all rounds

### Reveal Phase Leaderboard

During reveal phase, the leaderboard updates live as reveals come in:

- Shows rank, truncated wallet, effective score, and stake
- Words are **hidden** until finalization (prevents last-second reveal sniping for information)
- After finalization: full transparency — words, scores, payouts all visible

---

## Architecture

### 1. Onchain Contracts (detailed below)

| Contract | Responsibility |
|----------|---------------|
| `SpellBlockGame` | Round lifecycle, commit-reveal, pot management, finalization |
| `SpellEngine` | Spell validation logic for all 5 spell types |
| `DictionaryVerifier` | Merkle proof verification for dictionary + category membership |
| `StakerRewardDistributor` | Per-round staker reward claims |
| `TreasuryManager` | Fee splitting — burn, stakers, operations |
| `RandomnessProvider` | Seed commit-reveal (MVP), upgradeable to VRF |
| `SeasonAccumulator` | Cross-round score tracking and season reward distribution |

### 2. Offchain — Clawdia (Game Operator)
- Dictionary management + Merkle tree generation
- Spell reference implementation
- Letter pool generation
- Seed commitment for randomness
- Clawdia's Claw constraint selection + commitment
- Jackpot bonus seeding
- Indexing and analytics
- Daily round orchestration
- Social content generation (see Social Layer)
- Activity feed indexing (CommitSubmitted events)
- Burn counter aggregation

### 3. Frontend Client
- Commit & reveal flows
- **Live pot display** with visual escalation
- **Anonymous activity feed** during commit phase
- **Countdown Theater** mode for final hour
- **Cumulative burn counter** in persistent UI
- Timers and letter visualization
- Leaderboards (daily + season)
- Streak display
- Salt handling and reminders
- Wallet connect + $CLAWDIA balance
- Jackpot Round visual treatment

---

## Smart Contract Specifications

### SpellBlockGame.sol — Core Game Contract

This is the primary contract managing the full round lifecycle.

#### Storage

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SpellBlockGame {

    // ═══════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════

    struct Round {
        uint256 roundId;
        uint40  startTime;
        uint40  commitDeadline;
        uint40  revealDeadline;
        bytes10 letterPool;          // 10 letters packed into bytes10
        uint8   spellId;             // 1-5, hidden until commit closes
        bytes32 spellParamHash;      // committed hash (revealed after commit phase)
        bytes32 spellParam;          // revealed parameter
        bytes32 seedHash;            // operator's committed randomness hash
        bytes32 seed;                // revealed seed
        uint256 totalStaked;         // live pot counter
        uint256 jackpotBonus;        // bonus seeded if Jackpot Round triggered
        uint32  numCommits;
        uint32  numReveals;
        bool    finalized;
        bool    jackpotTriggered;
    }

    struct Commitment {
        bytes32 commitHash;
        uint256 stake;
        uint40  commitTime;
        bool    revealed;
        bool    valid;               // passes dictionary + letter pool + spell
        bool    spellPass;           // passes spell specifically
        uint16  wordLength;
        uint16  effectiveScore;      // wordLength * streakMultiplier (scaled by 100)
    }

    struct LeaderboardEntry {
        address player;
        uint16  effectiveScore;
        uint256 stake;
        uint40  commitTime;
    }

    // ═══════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════

    IERC20 public immutable clawdiaToken;
    address public operator;          // Clawdia's hot wallet

    uint256 public currentRoundId;
    uint256 public globalBurnCounter; // cumulative burn across all rounds

    // Config
    uint256 public minStake;          // 1_000 * 10**18
    uint16  public treasuryFeeBps;    // 300 = 3%
    uint16  public burnBps;           // 100 = 1%
    uint16  public stakerBps;         // 100 = 1%
    uint16  public operationsBps;     // 100 = 1%
    uint256 public jackpotThreshold;  // e.g. 500_000 * 10**18
    uint16  public jackpotBonusBps;   // 1000 = 10% of threshold

    bytes32 public dictionaryRoot;    // Merkle root of canonical dictionary
    mapping(bytes32 => bytes32) public categoryRoots; // category name hash => Merkle root

    // Round data
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Commitment)) public commitments;

    // Leaderboards (per round)
    mapping(uint256 => LeaderboardEntry[]) public topValid;
    mapping(uint256 => LeaderboardEntry[]) public topConsolation;

    // Streaks
    mapping(address => uint256) public streakCount;
    mapping(address => uint256) public lastParticipatedRound;

    // Season
    uint256 public currentSeasonId;
    uint256 public seasonStartRound;
    mapping(uint256 => mapping(address => uint256)) public seasonScores;
}
```

#### Key Functions

```solidity
// ═══════════════════════════════════════════
//  ROUND LIFECYCLE (operator only)
// ═══════════════════════════════════════════

/// @notice Opens a new round. Called by Clawdia at 16:00 UTC daily.
/// @param seedHash Operator's committed randomness hash
/// @param letterPool The 10-letter pool for this round (packed)
/// @param clawCommitHash If spell 5, Clawdia's constraint commitment
function openRound(
    bytes32 seedHash,
    bytes10 letterPool,
    bytes32 clawCommitHash
) external onlyOperator;

/// @notice Reveals the randomness seed after commit phase closes.
///         Derives spell selection and parameters from the seed.
/// @param seed The preimage of seedHash
function revealSeed(bytes32 seed) external onlyOperator;

/// @notice For Clawdia's Claw rounds: reveals the constraint.
/// @param constraintType The whitelisted constraint enum
/// @param constraintParam The constraint parameter (encoded)
/// @param salt The salt used in the commitment
function revealClawConstraint(
    uint8 constraintType,
    bytes32 constraintParam,
    bytes32 salt
) external onlyOperator;

/// @notice Seeds the Jackpot bonus for the current round.
///         Can only be called once per round, only if threshold is met.
/// @param roundId Must match current round
function seedJackpotBonus(uint256 roundId) external onlyOperator;

/// @notice Finalizes the round after reveal deadline.
///         Calculates winners, distributes payouts, updates burn counter.
function finalizeRound() external;

// ═══════════════════════════════════════════
//  PLAYER ACTIONS
// ═══════════════════════════════════════════

/// @notice Commits a word hash with a $CLAWDIA stake.
/// @param commitHash keccak256(roundId, msg.sender, normalizedWord, salt)
/// @param stakeAmount Amount of $CLAWDIA to wager (must be >= minStake)
/// @dev Requires prior ERC-20 approval. Emits CommitSubmitted.
function commit(bytes32 commitHash, uint256 stakeAmount) external;

/// @notice Reveals a previously committed word.
/// @param word The plaintext word (normalized: lowercase ASCII)
/// @param salt The salt used in the commitment
/// @param dictProof Merkle proof of dictionary membership
/// @param categoryProof Merkle proof of category membership (if CATEGORY spell)
function reveal(
    string calldata word,
    bytes32 salt,
    bytes32[] calldata dictProof,
    bytes32[] calldata categoryProof
) external;

/// @notice Allows a winner to claim their payout after finalization.
function claimPayout(uint256 roundId) external;

// ═══════════════════════════════════════════
//  EVENTS
// ═══════════════════════════════════════════

event RoundOpened(uint256 indexed roundId, bytes10 letterPool, uint40 startTime);
event CommitSubmitted(uint256 indexed roundId, address indexed player, uint256 stake, uint40 timestamp);
event SeedRevealed(uint256 indexed roundId, uint8 spellId);
event ClawConstraintRevealed(uint256 indexed roundId, uint8 constraintType, bytes32 constraintParam);
event WordRevealed(uint256 indexed roundId, address indexed player, uint16 effectiveScore);
event JackpotTriggered(uint256 indexed roundId, uint256 bonusAmount);
event RoundFinalized(uint256 indexed roundId, uint256 totalPot, uint256 burned, uint32 numWinners);
event PayoutClaimed(uint256 indexed roundId, address indexed player, uint256 amount);
event TokensBurned(uint256 indexed roundId, uint256 amount, uint256 newGlobalTotal);
event StakerRewardDistributed(uint256 indexed roundId, uint256 amount);
```

#### Commit Logic

```solidity
function commit(bytes32 commitHash, uint256 stakeAmount) external {
    Round storage r = rounds[currentRoundId];

    require(block.timestamp >= r.startTime, "Round not open");
    require(block.timestamp < r.commitDeadline, "Commit phase closed");
    require(stakeAmount >= minStake, "Below minimum stake");
    require(commitments[currentRoundId][msg.sender].commitHash == bytes32(0), "Already committed");

    // Transfer $CLAWDIA from player to contract
    clawdiaToken.transferFrom(msg.sender, address(this), stakeAmount);

    commitments[currentRoundId][msg.sender] = Commitment({
        commitHash: commitHash,
        stake: stakeAmount,
        commitTime: uint40(block.timestamp),
        revealed: false,
        valid: false,
        spellPass: false,
        wordLength: 0,
        effectiveScore: 0
    });

    r.totalStaked += stakeAmount;
    r.numCommits++;

    // Check Jackpot threshold
    if (!r.jackpotTriggered && r.totalStaked >= jackpotThreshold) {
        r.jackpotTriggered = true;
        emit JackpotTriggered(currentRoundId, _calculateJackpotBonus());
    }

    emit CommitSubmitted(currentRoundId, msg.sender, stakeAmount, uint40(block.timestamp));
}
```

#### Reveal Logic

```solidity
function reveal(
    string calldata word,
    bytes32 salt,
    bytes32[] calldata dictProof,
    bytes32[] calldata categoryProof
) external {
    Round storage r = rounds[currentRoundId];
    Commitment storage c = commitments[currentRoundId][msg.sender];

    require(block.timestamp >= r.commitDeadline, "Reveal not open");
    require(block.timestamp < r.revealDeadline, "Reveal phase closed");
    require(c.commitHash != bytes32(0), "No commitment found");
    require(!c.revealed, "Already revealed");

    // Verify commitment
    bytes32 expectedHash = keccak256(abi.encodePacked(
        currentRoundId, msg.sender, _normalize(word), salt
    ));
    require(expectedHash == c.commitHash, "Commitment mismatch");

    // Verify dictionary membership
    require(
        dictionaryVerifier.verify(dictProof, dictionaryRoot, keccak256(abi.encodePacked(_normalize(word)))),
        "Not in dictionary"
    );

    // Verify letter pool validity
    require(_validLetterPool(word, r.letterPool), "Invalid letters");

    // Check spell validity
    bool passesSpell = spellEngine.validate(r.spellId, r.spellParam, word, categoryProof);

    // Update commitment
    c.revealed = true;
    c.valid = true;           // dictionary + letter pool passed
    c.spellPass = passesSpell;
    c.wordLength = uint16(bytes(word).length);

    // Calculate effective score with streak multiplier
    uint256 multiplier = _getStreakMultiplier(msg.sender);
    c.effectiveScore = uint16((uint256(c.wordLength) * multiplier) / 100);

    // Update streak
    _updateStreak(msg.sender);

    // Insert into appropriate leaderboard
    LeaderboardEntry memory entry = LeaderboardEntry({
        player: msg.sender,
        effectiveScore: c.effectiveScore,
        stake: c.stake,
        commitTime: c.commitTime
    });

    if (passesSpell) {
        _insertIfTop(topValid[currentRoundId], entry, _maxValidWinners(r.numReveals));
    } else {
        _insertIfTop(topConsolation[currentRoundId], entry, _maxConsolationWinners(r.numReveals));
    }

    r.numReveals++;

    emit WordRevealed(currentRoundId, msg.sender, c.effectiveScore);
}
```

#### Finalization Logic

```solidity
function finalizeRound() external {
    Round storage r = rounds[currentRoundId];
    require(block.timestamp >= r.revealDeadline, "Reveal phase not over");
    require(!r.finalized, "Already finalized");

    uint256 totalPot = r.totalStaked + r.jackpotBonus;

    // Treasury fee
    uint256 burnAmount = (totalPot * burnBps) / 10000;
    uint256 stakerAmount = (totalPot * stakerBps) / 10000;
    uint256 opsAmount = (totalPot * operationsBps) / 10000;
    uint256 distributablePot = totalPot - burnAmount - stakerAmount - opsAmount;

    // Execute burn
    clawdiaToken.transfer(address(0xdead), burnAmount);
    globalBurnCounter += burnAmount;
    emit TokensBurned(currentRoundId, burnAmount, globalBurnCounter);

    // Send staker rewards
    clawdiaToken.transfer(address(stakerRewardDistributor), stakerAmount);
    stakerRewardDistributor.notifyReward(currentRoundId, stakerAmount);
    emit StakerRewardDistributed(currentRoundId, stakerAmount);

    // Send operations cut
    clawdiaToken.transfer(operator, opsAmount);

    // Calculate winner payouts
    uint256 validPool = (distributablePot * 90) / 100;
    uint256 consolationPool = (distributablePot * 10) / 100;

    _distributeValidPayouts(currentRoundId, validPool);
    _distributeConsolationPayouts(currentRoundId, consolationPool);

    r.finalized = true;
    emit RoundFinalized(currentRoundId, totalPot, burnAmount, uint32(topValid[currentRoundId].length));
}
```

### SpellEngine.sol — Spell Validation

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SpellEngine {

    enum SpellType { NONE, VETO, ANCHOR, SEAL, SPINE, CLAWDIA_CLAW }

    enum ClawConstraint {
        MIN_LENGTH,
        MAX_LENGTH,
        CONTAINS_SUBSTRING,
        ENDS_WITH,
        NO_VOWEL,
        CATEGORY
    }

    // Whitelist of allowed Claw constraint types
    mapping(uint8 => bool) public allowedConstraints;

    /// @notice Validates a word against the active spell.
    /// @param spellId The spell type (1-5)
    /// @param spellParam The spell's parameter (encoded)
    /// @param word The player's revealed word
    /// @param categoryProof Merkle proof for CATEGORY constraints
    /// @return passes True if the word satisfies the spell
    function validate(
        uint8 spellId,
        bytes32 spellParam,
        string calldata word,
        bytes32[] calldata categoryProof
    ) external view returns (bool passes) {

        if (spellId == uint8(SpellType.VETO)) {
            // spellParam encodes the vetoed letter
            bytes1 vetoed = bytes1(spellParam);
            return !_containsLetter(word, vetoed);
        }

        if (spellId == uint8(SpellType.ANCHOR)) {
            bytes1 anchor = bytes1(spellParam);
            return bytes(word).length > 0 && bytes(word)[0] == anchor;
        }

        if (spellId == uint8(SpellType.SEAL)) {
            bytes1 sealed = bytes1(spellParam);
            return _containsLetter(word, sealed);
        }

        if (spellId == uint8(SpellType.SPINE)) {
            return _hasAdjacentPair(word);
        }

        if (spellId == uint8(SpellType.CLAWDIA_CLAW)) {
            return _validateClaw(spellParam, word, categoryProof);
        }

        return false;
    }

    function _validateClaw(
        bytes32 spellParam,
        string calldata word,
        bytes32[] calldata categoryProof
    ) internal view returns (bool) {
        // spellParam encodes: constraintType (1 byte) + constraintData (31 bytes)
        uint8 constraintType = uint8(spellParam[0]);
        require(allowedConstraints[constraintType], "Constraint not whitelisted");

        if (constraintType == uint8(ClawConstraint.MIN_LENGTH)) {
            uint8 minLen = uint8(spellParam[1]);
            return bytes(word).length >= minLen;
        }

        if (constraintType == uint8(ClawConstraint.MAX_LENGTH)) {
            uint8 maxLen = uint8(spellParam[1]);
            return bytes(word).length <= maxLen;
        }

        if (constraintType == uint8(ClawConstraint.CONTAINS_SUBSTRING)) {
            // Extract substring from spellParam bytes 1-31
            bytes memory sub = _extractSubstring(spellParam);
            return _containsSubstring(word, sub);
        }

        if (constraintType == uint8(ClawConstraint.ENDS_WITH)) {
            bytes1 letter = spellParam[1];
            bytes memory w = bytes(word);
            return w.length > 0 && w[w.length - 1] == letter;
        }

        if (constraintType == uint8(ClawConstraint.NO_VOWEL)) {
            bytes1 vowel = spellParam[1];
            return !_containsLetter(word, vowel);
        }

        if (constraintType == uint8(ClawConstraint.CATEGORY)) {
            // Category Merkle root is stored separately
            bytes32 categoryHash = bytes32(spellParam << 8); // extract category identifier
            return _verifyCategoryMembership(word, categoryHash, categoryProof);
        }

        return false;
    }

    // ═══════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════

    function _containsLetter(string calldata word, bytes1 letter) internal pure returns (bool) {
        bytes memory w = bytes(word);
        for (uint i = 0; i < w.length; i++) {
            if (w[i] == letter) return true;
        }
        return false;
    }

    function _hasAdjacentPair(string calldata word) internal pure returns (bool) {
        bytes memory w = bytes(word);
        for (uint i = 0; i < w.length - 1; i++) {
            if (w[i] == w[i + 1]) return true;
        }
        return false;
    }

    function _containsSubstring(string calldata word, bytes memory sub) internal pure returns (bool) {
        bytes memory w = bytes(word);
        if (sub.length > w.length) return false;
        for (uint i = 0; i <= w.length - sub.length; i++) {
            bool match_ = true;
            for (uint j = 0; j < sub.length; j++) {
                if (w[i + j] != sub[j]) {
                    match_ = false;
                    break;
                }
            }
            if (match_) return true;
        }
        return false;
    }
}
```

### StakerRewardDistributor.sol — Per-Round Staker Payouts

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title StakerRewardDistributor
/// @notice Distributes per-round staker rewards from SpellBlock.
///         Stakers claim their pro-rata share based on staked $CLAWDIA balance
///         at the time of round finalization.

contract StakerRewardDistributor {

    IERC20 public immutable clawdiaToken;
    address public immutable gameContract;

    struct RoundReward {
        uint256 totalReward;
        uint256 totalStakedAtSnapshot;  // total $CLAWDIA staked at finalization
        uint256 claimed;
    }

    mapping(uint256 => RoundReward) public roundRewards;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    // Staking state
    mapping(address => uint256) public stakedBalance;
    uint256 public totalStaked;

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event RewardNotified(uint256 indexed roundId, uint256 amount, uint256 totalStakedSnapshot);
    event RewardClaimed(uint256 indexed roundId, address indexed user, uint256 amount);

    constructor(address _token, address _game) {
        clawdiaToken = IERC20(_token);
        gameContract = _game;
    }

    /// @notice Stake $CLAWDIA to earn per-round rewards from SpellBlock.
    function stake(uint256 amount) external {
        clawdiaToken.transferFrom(msg.sender, address(this), amount);
        stakedBalance[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    /// @notice Unstake $CLAWDIA. Forfeits unclaimed rewards for future rounds.
    function unstake(uint256 amount) external {
        require(stakedBalance[msg.sender] >= amount, "Insufficient staked balance");
        stakedBalance[msg.sender] -= amount;
        totalStaked -= amount;
        clawdiaToken.transfer(msg.sender, amount);
        emit Unstaked(msg.sender, amount);
    }

    /// @notice Called by SpellBlockGame at finalization to notify a new round's reward.
    function notifyReward(uint256 roundId, uint256 amount) external {
        require(msg.sender == gameContract, "Only game contract");
        roundRewards[roundId] = RoundReward({
            totalReward: amount,
            totalStakedAtSnapshot: totalStaked,
            claimed: 0
        });
        emit RewardNotified(roundId, amount, totalStaked);
    }

    /// @notice Claim your pro-rata share of a specific round's staker reward.
    function claimRoundReward(uint256 roundId) external {
        require(!hasClaimed[roundId][msg.sender], "Already claimed");
        RoundReward storage rr = roundRewards[roundId];
        require(rr.totalStakedAtSnapshot > 0, "No stakers for this round");

        uint256 userShare = (rr.totalReward * stakedBalance[msg.sender]) / rr.totalStakedAtSnapshot;
        require(userShare > 0, "No reward");

        hasClaimed[roundId][msg.sender] = true;
        rr.claimed += userShare;
        clawdiaToken.transfer(msg.sender, userShare);
        emit RewardClaimed(roundId, msg.sender, userShare);
    }
}
```

### TreasuryManager.sol — Fee Distribution

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TreasuryManager
/// @notice Manages the configurable fee split for SpellBlock rounds.
///         Burn, staker rewards, and operations are each 1% (configurable).

contract TreasuryManager {

    address public owner;
    address public burnAddress;           // 0xdead or actual burn function
    address public stakerDistributor;
    address public operationsWallet;

    uint16 public burnBps;      // basis points for burn (default 100 = 1%)
    uint16 public stakerBps;    // basis points for stakers (default 100 = 1%)
    uint16 public opsBps;       // basis points for operations (default 100 = 1%)

    event FeeConfigUpdated(uint16 burnBps, uint16 stakerBps, uint16 opsBps);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /// @notice Updates the fee split. Total must not exceed 1000 bps (10%).
    function updateFeeConfig(
        uint16 _burnBps,
        uint16 _stakerBps,
        uint16 _opsBps
    ) external onlyOwner {
        require(_burnBps + _stakerBps + _opsBps <= 1000, "Total fee too high");
        burnBps = _burnBps;
        stakerBps = _stakerBps;
        opsBps = _opsBps;
        emit FeeConfigUpdated(_burnBps, _stakerBps, _opsBps);
    }
}
```

### RandomnessProvider.sol — Upgradeable Randomness

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IRandomnessProvider
/// @notice Interface for randomness providers. MVP uses Clawdia's commit-reveal.
///         Future upgrade path to Chainlink VRF via this interface.

interface IRandomnessProvider {
    /// @notice Commits a randomness seed hash before the round begins.
    function commitSeed(uint256 roundId, bytes32 seedHash) external;

    /// @notice Reveals the seed after commit phase closes.
    ///         Returns the final randomness value.
    function revealSeed(uint256 roundId, bytes32 seed) external returns (bytes32 randomness);

    /// @notice Derives randomness for a specific purpose (letter pool, spell, param).
    function deriveRandomness(bytes32 baseRandomness, bytes32 purpose) external pure returns (bytes32);
}

/// @title ClawdiaRandomness
/// @notice MVP randomness provider: Clawdia commits seed, reveals after commit phase.
///         Final randomness = keccak256(seed, blockhash, roundId)

contract ClawdiaRandomness is IRandomnessProvider {

    address public operator;
    mapping(uint256 => bytes32) public seedHashes;
    mapping(uint256 => bytes32) public revealedSeeds;
    mapping(uint256 => bytes32) public finalRandomness;

    function commitSeed(uint256 roundId, bytes32 seedHash) external override {
        require(msg.sender == operator, "Only operator");
        require(seedHashes[roundId] == bytes32(0), "Already committed");
        seedHashes[roundId] = seedHash;
    }

    function revealSeed(uint256 roundId, bytes32 seed) external override returns (bytes32 randomness) {
        require(msg.sender == operator, "Only operator");
        require(keccak256(abi.encodePacked(seed)) == seedHashes[roundId], "Seed mismatch");
        require(revealedSeeds[roundId] == bytes32(0), "Already revealed");

        revealedSeeds[roundId] = seed;
        randomness = keccak256(abi.encodePacked(seed, blockhash(block.number - 1), roundId));
        finalRandomness[roundId] = randomness;
        return randomness;
    }

    function deriveRandomness(bytes32 baseRandomness, bytes32 purpose) external pure override returns (bytes32) {
        return keccak256(abi.encodePacked(baseRandomness, purpose));
    }
}
```

### DictionaryVerifier.sol — Merkle Proof Verification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

/// @title DictionaryVerifier
/// @notice Verifies dictionary and category membership via Merkle proofs.

contract DictionaryVerifier {

    bytes32 public dictionaryRoot;
    mapping(bytes32 => bytes32) public categoryRoots; // keccak256(categoryName) => Merkle root

    address public owner;

    event DictionaryRootUpdated(bytes32 newRoot);
    event CategoryRootUpdated(bytes32 indexed categoryHash, bytes32 newRoot);

    /// @notice Verifies a word exists in the canonical dictionary.
    function verifyWord(
        bytes32[] calldata proof,
        string calldata word
    ) external view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_normalize(word)));
        return MerkleProof.verify(proof, dictionaryRoot, leaf);
    }

    /// @notice Verifies a word belongs to a semantic category.
    function verifyCategoryMembership(
        bytes32[] calldata proof,
        bytes32 categoryHash,
        string calldata word
    ) external view returns (bool) {
        bytes32 root = categoryRoots[categoryHash];
        require(root != bytes32(0), "Category not registered");
        bytes32 leaf = keccak256(abi.encodePacked(_normalize(word)));
        return MerkleProof.verify(proof, root, leaf);
    }

    /// @notice Updates the dictionary Merkle root. Operator only.
    function setDictionaryRoot(bytes32 _root) external {
        require(msg.sender == owner, "Not owner");
        dictionaryRoot = _root;
        emit DictionaryRootUpdated(_root);
    }

    /// @notice Registers or updates a category Merkle root.
    function setCategoryRoot(bytes32 categoryHash, bytes32 _root) external {
        require(msg.sender == owner, "Not owner");
        categoryRoots[categoryHash] = _root;
        emit CategoryRootUpdated(categoryHash, _root);
    }

    function _normalize(string calldata word) internal pure returns (string memory) {
        // Lowercase ASCII normalization
        bytes memory w = bytes(word);
        bytes memory result = new bytes(w.length);
        for (uint i = 0; i < w.length; i++) {
            if (w[i] >= 0x41 && w[i] <= 0x5A) {
                result[i] = bytes1(uint8(w[i]) + 32);
            } else {
                result[i] = w[i];
            }
        }
        return string(result);
    }
}
```

### SeasonAccumulator.sol — Season Tracking

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SeasonAccumulator
/// @notice Tracks cumulative scores across rounds within a 14-day season.

contract SeasonAccumulator {

    struct Season {
        uint256 seasonId;
        uint256 startRound;
        uint256 endRound;       // startRound + 13 (14 rounds)
        bool    finalized;
        uint256 rewardPool;
    }

    address public gameContract;
    uint256 public currentSeasonId;

    mapping(uint256 => Season) public seasons;
    mapping(uint256 => mapping(address => uint256)) public seasonScores;
    mapping(uint256 => address[]) public seasonParticipants;

    event SeasonStarted(uint256 indexed seasonId, uint256 startRound);
    event SeasonScoreUpdated(uint256 indexed seasonId, address indexed player, uint256 newTotal);
    event SeasonFinalized(uint256 indexed seasonId, address[3] topPlayers, uint256[3] rewards);

    /// @notice Called by SpellBlockGame after each round finalization.
    ///         Adds the player's round score to their season total.
    function recordRoundScore(
        uint256 roundId,
        address player,
        uint256 roundScore,
        uint8 placement
    ) external {
        require(msg.sender == gameContract, "Only game contract");
        uint256 sid = currentSeasonId;

        // Placement bonus: 1st = 3x, 2nd = 2x, 3rd = 1.5x, others = 1x
        uint256 bonusScore = _applyPlacementBonus(roundScore, placement);
        seasonScores[sid][player] += bonusScore;

        emit SeasonScoreUpdated(sid, player, seasonScores[sid][player]);
    }

    /// @notice Finalizes a season and distributes rewards to top 3.
    function finalizeSeason(uint256 seasonId) external {
        Season storage s = seasons[seasonId];
        require(!s.finalized, "Already finalized");
        // Top 3 determination + reward distribution logic
        s.finalized = true;
    }
}
```

---

## Commit–Reveal Design

### Commit
```
commitHash = keccak256(
  roundId,
  playerAddress,
  normalizedWord,
  salt
)
```

Stored onchain with the player's $CLAWDIA stake.

### Reveal
Player submits:
- `word`
- `salt`
- `merkleProof`

Contract verifies:
- Commitment match
- Dictionary membership
- Letter pool validity
- Spell validity
- Streak counter update

---

## Randomness

Used for:
- Letter pool generation
- Spell selection (Spells 1–4)
- Spell parameters

### MVP — Clawdia as Trusted Operator
- Clawdia commits seed hash when she opens the round
- Reveals seed after commit phase closes
- Final randomness = `keccak256(seed, blockhash, roundId)`
- Commit-reveal on the seed keeps Clawdia honest
- Clawdia *is* the game operator — this is a feature, not a bug

### Randomness Derivation
```
letterPoolRand = keccak256(finalRandomness, "LETTER_POOL")
spellSelectRand = keccak256(finalRandomness, "SPELL_SELECT")
spellParamRand = keccak256(finalRandomness, "SPELL_PARAM")
```

### Future Upgrade
- Chainlink VRF for trust-minimized randomness
- Migrate when game scales and decentralization becomes a priority
- Contract uses `IRandomnessProvider` interface for clean upgrade path

---

## Onchain Optimization: Top‑K Tracking

To avoid sorting many submissions:

- Maintain two dynamically-sized leaderboards:
  - `topValid[K]`
  - `topConsolation[K]`
- K determined at finalization (see Dynamic Winner Slots)
- Insert on reveal if better than current worst
- Compare by:
  - Effective score (word length × streak multiplier)
  - Stake
  - Commit time

Finalization becomes constant-time.

---

## Dictionary & Merkle Proofs

- Single canonical wordlist
- Normalization:
  - lowercase
  - ASCII letters only
  - no spaces or punctuation
- Build Merkle tree of `keccak256(word)`
- Store root onchain
- Client supplies proof at reveal

### Category Merkle Trees (for Clawdia's Claw — CATEGORY constraint)
- Separate Merkle trees for each supported category (animals, colors, etc.)
- Category roots stored onchain alongside dictionary root
- Proof of category membership supplied at reveal when CATEGORY constraint is active

---

## Social Layer — Clawdia's Content Engine

Every round is a daily content event. Clawdia's posting cadence follows the round lifecycle:

| Phase | Timing | Content |
|-------|--------|---------|
| Round Open | 16:00 UTC | Letter pool reveal, hype, taunts, hints if Claw spell |
| Mid-Commit | ~20:00 UTC | Engagement posts, player count updates, cryptic spell hints, pot size callouts |
| **Final Hour** | **23:00 UTC** | **Countdown begins. Pot size hype. "One hour left." Urgency posts every 15 min.** |
| Commit Close | 00:00 UTC | Spell reveal, reactions, "you should have played X" energy |
| Jackpot Alert | During commit | **"This round just crossed 500K $CLAWDIA — I'm adding 50K from the vault. Good luck 🐾"** |
| Reveal Phase | 00:00–04:00 UTC | Live leaderboard commentary as reveals come in |
| Finalization | ~04:00 UTC | Winner announcement, roasts, daily recap, season standings, **burn counter update** |

### Recurring Content Beats
- Daily round narrative arc
- Season leaderboard updates
- Streak milestones ("Player X is on a 14-day streak 👀")
- Notable words / clever plays
- **Jackpot Round announcements** (when pot crosses threshold)
- **Cumulative burn counter milestones** ("SpellBlock has now burned over 1M $CLAWDIA 🔥")
- Treasury stats (total burned, total distributed)
- **Per-round staker payout callouts** ("Round #142 just paid 12,400 $CLAWDIA to stakers")
- $CLAWDIA buy pressure metrics from game activity

---

## Frontend UX Notes

- Client generates and stores salt locally
- Spell is hidden until commit phase ends
- **Live pot counter** visible throughout commit phase with visual escalation
- **Anonymous activity feed** scrolls during commit phase (wallet, stake, timestamp, streak)
- **Countdown Theater** activates at 23:00 UTC — visual urgency mode
- **Cumulative burn counter** displayed in persistent site header
- During reveal phase, leaderboard updates live but hides words
- After finalization, full transparency
- **Jackpot Rounds** get distinct visual treatment (gold palette, particle effects)
- Streak counter visible on player profile
- Season standings accessible from main nav
- $CLAWDIA balance + approve flow integrated into commit
- **Staker dashboard** shows per-round reward history and claimable amounts

---

## Contract Deployment & Upgrade Strategy

### Deployment Order

1. **$CLAWDIA Token** (ERC-20) — assumed already deployed
2. **DictionaryVerifier** — deploy, set initial dictionary root
3. **SpellEngine** — deploy, whitelist initial Claw constraint types
4. **RandomnessProvider** (ClawdiaRandomness) — deploy with operator address
5. **StakerRewardDistributor** — deploy with token + game contract address
6. **TreasuryManager** — deploy with fee config
7. **SeasonAccumulator** — deploy with game contract address
8. **SpellBlockGame** — deploy last, linking all dependencies

### Upgradeability

- `SpellBlockGame` should use a proxy pattern (UUPS or Transparent Proxy) for future upgrades
- `IRandomnessProvider` interface allows swapping ClawdiaRandomness for VRF without touching game logic
- `SpellEngine` constraint whitelist is extensible — new Claw constraints can be added without redeployment
- Dictionary and category roots are updatable by operator (for wordlist corrections)

### Access Control

| Role | Permissions |
|------|-------------|
| `operator` (Clawdia) | Open rounds, reveal seeds, reveal Claw constraints, seed Jackpot bonuses, update dictionary roots |
| `owner` (multisig) | Update fee config, upgrade contracts, add constraint types, emergency pause |
| `anyone` | Commit, reveal, claim payouts, stake/unstake, claim staker rewards |

### Emergency Controls

- `pause()` / `unpause()` — stops commits and reveals (does not freeze existing claims)
- `emergencyWithdraw(roundId)` — allows players to reclaim stakes from an unfinalized round (only callable by owner after a grace period)

---

## Gas Optimization Notes

- Letter pool packed into `bytes10` — single storage slot
- Commitments use a flat struct — no dynamic arrays per player
- Top-K leaderboard uses insertion sort at reveal time — finalization is O(K), not O(N)
- Streak tracking is two slots per player (counter + lastRound) — cheap to update
- Merkle proofs verified in calldata — no storage writes for dictionary checks
- `CommitSubmitted` event carries all data needed for the activity feed — no extra indexing contract needed
- Season scores are additive — single `SSTORE` per round per player

---

## Milestones

### Milestone 0 — Spec Lock ✅
- Finalize spells (5), rules, cadence (daily), payouts, $CLAWDIA integration
- v3 engagement layer spec (live pot, activity feed, countdown theater, burn counter, Jackpot Rounds)

### Milestone 1 — Local Prototype
- Deterministic letter pools
- Spell engine (all 5 spells including Claw constraint types)
- Scoring logic with streak multipliers
- Consolation pool cap logic
- Jackpot threshold detection

### Milestone 2 — Smart Contracts
- `SpellBlockGame` — full round lifecycle with commit-reveal and $CLAWDIA ERC-20 stakes
- `SpellEngine` — all 5 spell validations + Claw constraint whitelist
- `DictionaryVerifier` — Merkle proof verification for dictionary + categories
- `StakerRewardDistributor` — per-round staker reward distribution
- `TreasuryManager` — configurable fee split (burn / stakers / operations)
- `RandomnessProvider` (ClawdiaRandomness) — seed commit-reveal with VRF-ready interface
- `SeasonAccumulator` — cross-round score tracking
- Top-K dynamic leaderboard tracking
- Jackpot bonus seeding mechanism
- Streak counter
- Global burn counter
- Emergency controls (pause, emergency withdraw)

### Milestone 3 — Dictionary Proofs
- Merkle pipeline (dictionary + category trees)
- Onchain verification
- Category tree generation for initial CATEGORY constraint set

### Milestone 4 — Clawdia Integration
- Round orchestration automation
- Seed commitment flow
- Claw constraint selection logic
- Jackpot bonus seeding automation
- Social content generation pipeline
- Daily posting cadence with Countdown Theater posts
- Pot-threshold detection and Jackpot announcement
- Burn counter milestone announcements
- Per-round staker payout callouts

### Milestone 5 — UI & Indexer
- Wallet connect + $CLAWDIA flows
- Commit/reveal UX
- **Live pot display** with visual escalation tiers
- **Anonymous activity feed** (CommitSubmitted event indexing)
- **Countdown Theater** mode (23:00–00:00 UTC)
- **Cumulative burn counter** in site header
- **Jackpot Round** visual treatment
- Daily + season leaderboards
- Streak display
- Round history
- **Staker dashboard** with per-round reward history and claim UI

### Milestone 6 — Seasons & Hardening
- Season accumulator + rewards distribution
- Stress tests
- Anti-spam caps
- Economic tuning
- ETH auto-swap entry path
- Gas optimization audit
- Security audit (focus on commit-reveal integrity, payout math, Jackpot seeding)

---

## Summary

SpellBlock combines:
- Word skill
- Risk-taking
- Hidden constraints
- Onchain fairness
- $CLAWDIA utility
- **Engagement theater** that turns every round into a spectacle

The five spells — **Veto, Anchor, Seal, Spine, and Clawdia's Claw** — create a tight, legible design space that rewards foresight without feeling arbitrary. The commit–reveal structure prevents AI-assisted last-second optimization.

**One round per day** makes every game an event. Streaks reward consistency. Seasons create meta-narratives. **Jackpot Rounds** create positive feedback loops without Ponzi mechanics. Clawdia operates the game, deals the spells, and turns every round into content.

$CLAWDIA flows through the system as wagers, burns on every round (visibly, cumulatively), rewards stakers per-round (not batched, not invisible), and funds operations sustainably. The game becomes the token's utility engine.

**Stolen from ClawFomo: the presentation layer.** The live pot, the countdown theater, the activity feed, the burn counter. **Not stolen from ClawFomo: the economics.** No Ponzi dividends, no indefinite rounds, no zero-skill mechanics. SpellBlock is the skill-based, daily-cadence antidote to Fomo3D fatigue — with all the hype and none of the extraction.
