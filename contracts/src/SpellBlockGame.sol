// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {ISpellEngine} from "./interfaces/ISpellEngine.sol";
import {IDictionaryVerifier} from "./interfaces/IDictionaryVerifier.sol";
import {IStakerRewardDistributor} from "./interfaces/IStakerRewardDistributor.sol";
import {SpellRegistry} from "./SpellRegistry.sol";

/// @notice Minimal interface for ERC20 burn functionality
interface IERC20Burnable {
    function burn(uint256 amount) external;
}

/// @title SpellBlockGame
/// @notice Core game contract for SpellBlock - a commit-reveal word game
/// @dev One round per day. Players commit words + stakes, reveal after spell is shown.
contract SpellBlockGame is ReentrancyGuard, Pausable {

    // ═══════════════════════════════════════════
    //  STRUCTS
    // ═══════════════════════════════════════════

    struct Round {
        uint256 roundId;
        uint256 startTime;
        uint256 commitDeadline;
        uint256 revealDeadline;
        bytes8 letterPool;        // Changed from bytes10 to bytes8 per spec
        uint8 spellId;
        bytes32 spellParam;        // Revealed spell parameter
        bytes32 seedHash;          // Committed seed (hidden during commit phase)
        bytes32 seed;              // Revealed seed
        bytes32 rulerCommitHash;   // Committed ruler lengths hash (hidden during commit phase)
        uint8[3] validLengths;     // Revealed valid word lengths (Clawdia's Ruler)
        uint256 totalStaked;
        uint256 jackpotBonus;
        uint32 numCommits;
        uint32 numReveals;
        uint32 validWinners;       // Number of players who passed both spell AND length
        uint32 consolationWinners; // Number of players who passed spell but failed length
        bool finalized;
        bool jackpotTriggered;
        bool seedRevealed;
        bool rulerRevealed;
    }

    struct Commitment {
        bytes32 commitHash;
        uint256 stake;
        uint256 commitTime;
        bool revealed;
        bool spellPass;       // Did the word pass the spell?
        bool lengthValid;     // Did the word length match one of the 3 valid lengths?
        bool fullyValid;      // Did the word pass BOTH spell AND length? (valid winner)
        bool consolation;     // Did the word pass spell but fail length? (consolation eligible)
        uint16 wordLength;
        uint16 effectiveScore;
        uint256 payout;
        bool claimed;
    }

    struct LeaderboardEntry {
        address player;
        uint16 effectiveScore;
        uint256 stake;
        uint256 commitTime;
    }

    // ═══════════════════════════════════════════
    //  STATE
    // ═══════════════════════════════════════════

    IERC20 public immutable clawdiaToken;
    ISpellEngine public spellEngine;
    IDictionaryVerifier public dictionaryVerifier;
    IStakerRewardDistributor public stakerDistributor;
    SpellRegistry public spellRegistry;

    address public operator;
    address public owner;

    uint256 public currentRoundId;
    uint256 public globalBurnCounter;
    uint256 public rolloverAmount;       // Accumulated funds from rounds with no valid winners

    // Config
    uint256 public minStake;
    uint16 public treasuryFeeBps;
    uint16 public burnBps;
    uint16 public stakerBps;
    uint16 public operationsBps;
    uint256 public jackpotThreshold;
    uint16 public jackpotBonusBps;
    uint256 public payoutExpiryDays;    // Days after which unclaimed payouts can be swept

    // Round data
    mapping(uint256 => Round) public rounds;
    mapping(uint256 => mapping(address => Commitment)) public commitments;
    mapping(uint256 => LeaderboardEntry[]) public topValid;
    mapping(uint256 => LeaderboardEntry[]) public topConsolation;

    // Streaks
    mapping(address => uint256) public streakCount;
    mapping(address => uint256) public lastParticipatedRound;

    // ═══════════════════════════════════════════
    //  EVENTS
    // ═══════════════════════════════════════════

    event RoundOpened(uint256 indexed roundId, bytes8 letterPool, bytes32 rulerCommitHash, uint256 startTime);
    event CommitSubmitted(uint256 indexed roundId, address indexed player, uint256 stake, uint256 timestamp, uint256 streak);
    event SeedAndRulerRevealed(uint256 indexed roundId, uint8 spellId, bytes32 spellParam, uint8[3] validLengths);
    event WordRevealed(uint256 indexed roundId, address indexed player, uint16 effectiveScore, bool spellPass, bool lengthValid, bool fullyValid);
    event JackpotTriggered(uint256 indexed roundId, uint256 bonusAmount);
    event JackpotSeeded(uint256 indexed roundId, uint256 bonusAmount);
    event RoundFinalized(uint256 indexed roundId, uint256 totalPot, uint256 burned, uint32 numWinners);
    event PayoutClaimed(uint256 indexed roundId, address indexed player, uint256 amount);
    event TokensBurned(uint256 indexed roundId, uint256 amount, uint256 newGlobalTotal);
    event StakerRewardDistributed(uint256 indexed roundId, uint256 amount);
    event RolloverAdded(uint256 indexed roundId, uint256 amount, uint256 totalRollover);
    event RolloverApplied(uint256 indexed roundId, uint256 amount);
    event UnclaimedPayoutsSwept(uint256 indexed roundId, uint256 amount, address operator);

    // ═══════════════════════════════════════════
    //  MODIFIERS
    // ═══════════════════════════════════════════

    modifier onlyOperator() {
        require(msg.sender == operator, "Only operator");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    // ═══════════════════════════════════════════
    //  CONSTRUCTOR
    // ═══════════════════════════════════════════

    constructor(
        address _token,
        address _operator,
        address _owner,
        address _spellEngine,
        address _dictionaryVerifier,
        address _stakerDistributor,
        address _spellRegistry
    ) {
        clawdiaToken = IERC20(_token);
        operator = _operator;
        owner = _owner;
        spellEngine = ISpellEngine(_spellEngine);
        dictionaryVerifier = IDictionaryVerifier(_dictionaryVerifier);
        stakerDistributor = IStakerRewardDistributor(_stakerDistributor);
        spellRegistry = SpellRegistry(_spellRegistry);

        // Default config per v3 spec
        minStake = 1_000_000 * 10**18;    // 1,000,000 $CLAWDIA minimum
        treasuryFeeBps = 300;             // 3% total treasury fee
        burnBps = 100;                    // 1% burn
        stakerBps = 100;                  // 1% stakers  
        operationsBps = 100;              // 1% operations
        jackpotThreshold = 500_000 * 10**18; // 500K $CLAWDIA threshold
        jackpotBonusBps = 1000;           // 10% bonus when threshold crossed
        payoutExpiryDays = 30;            // 30 days to claim payouts before sweep
    }

    // ═══════════════════════════════════════════
    //  ROUND LIFECYCLE (operator)
    // ═══════════════════════════════════════════

    /// @notice Opens a new round with committed seed and ruler lengths (both hidden)
    /// @param seedHash keccak256 of the random seed for this round
    /// @param rulerCommitHash keccak256(roundId, L1, L2, L3, rulerSalt) for the 3 valid lengths
    /// @param letterPool The 8-letter pool for this round
    function openRound(
        bytes32 seedHash,
        bytes32 rulerCommitHash, 
        bytes8 letterPool
    ) external onlyOperator whenNotPaused {
        // Validate letter pool is not empty
        require(letterPool != bytes8(0), "Letter pool cannot be empty");
        
        // Validate all 8 bytes are valid ASCII uppercase letters (A-Z = 0x41-0x5A)
        for (uint256 i = 0; i < 8; i++) {
            bytes1 letter = letterPool[i];
            require(
                uint8(letter) >= 0x41 && uint8(letter) <= 0x5A,
                "Letter pool must contain only uppercase A-Z"
            );
        }
        
        // Validate letter pool contains at least 2 vowels (A, E, I, O, U)
        uint256 vowelCount = 0;
        for (uint256 i = 0; i < 8; i++) {
            uint8 letter = uint8(letterPool[i]);
            if (letter == 0x41 || letter == 0x45 || letter == 0x49 || letter == 0x4F || letter == 0x55) {
                vowelCount++;
            }
        }
        require(vowelCount >= 2, "Letter pool must contain at least 2 vowels");
        
        currentRoundId++;
        uint256 rid = currentRoundId;

        uint256 startTime = block.timestamp;
        // Schedule: 16:00 UTC start → 08:00 UTC next day (commits close, spell revealed) → 15:45 UTC next day (reveals close)
        uint256 commitDeadline = startTime + 16 hours;
        uint256 revealDeadline = commitDeadline + 7 hours + 45 minutes;

        rounds[rid] = Round({
            roundId: rid,
            startTime: startTime,
            commitDeadline: commitDeadline,
            revealDeadline: revealDeadline,
            letterPool: letterPool,
            spellId: 0,
            spellParam: bytes32(0),
            seedHash: seedHash,
            seed: bytes32(0),
            rulerCommitHash: rulerCommitHash,
            validLengths: [0, 0, 0],
            totalStaked: 0,
            jackpotBonus: 0,
            numCommits: 0,
            numReveals: 0,
            validWinners: 0,
            consolationWinners: 0,
            finalized: false,
            jackpotTriggered: false,
            seedRevealed: false,
            rulerRevealed: false
        });

        emit RoundOpened(rid, letterPool, rulerCommitHash, startTime);
    }

    /// @notice Reveals both seed and ruler lengths after commit phase closes (double reveal)
    /// @param seed The pre-committed random seed
    /// @param validLengths The 3 valid word lengths (Clawdia's Ruler)
    /// @param rulerSalt The salt used in ruler commitment
    function revealSeedAndRuler(
        bytes32 seed,
        uint8[3] calldata validLengths,
        bytes32 rulerSalt
    ) external onlyOperator {
        Round storage r = rounds[currentRoundId];
        require(block.timestamp >= r.commitDeadline, "Commit phase not over");
        require(!r.seedRevealed, "Already revealed");
        
        // Verify seed commitment
        require(keccak256(abi.encodePacked(seed)) == r.seedHash, "Seed mismatch");
        
        // Verify ruler commitment
        require(
            spellRegistry.verifyRulerCommitment(r.roundId, validLengths, rulerSalt, r.rulerCommitHash),
            "Ruler commitment mismatch"
        );
        
        // Validate ruler lengths satisfy constraints
        require(spellRegistry.validateRulerLengths(validLengths), "Invalid ruler lengths");

        // Store revealed values
        r.seed = seed;
        r.validLengths = validLengths;
        r.seedRevealed = true;
        r.rulerRevealed = true;
        
        // Generate spell from final randomness
        bytes32 finalRandomness = keccak256(abi.encodePacked(seed, blockhash(block.number - 1), r.roundId));
        uint256 spellSeed = uint256(finalRandomness);
        
        // Pick spell 0-3 (exactly 4 spells in v3)
        r.spellId = uint8(spellSeed % 4);
        
        // Pick spell param based on letter pool (for Veto/Anchor/Seal)
        // NOTE: r.letterPool must be non-empty and contain valid ASCII A-Z letters
        // The openRound() function validates this at deployment time
        if (r.spellId < 3) {  // Veto, Anchor, or Seal need a letter param
            uint256 letterIndex = (spellSeed >> 8) % 8;  // 8-letter pool
            // Extract the letter at the random index and use as spell parameter
            r.spellParam = bytes32(bytes1(r.letterPool[letterIndex]));
        } else {
            r.spellParam = bytes32(0);  // Gem doesn't need a param
        }

        emit SeedAndRulerRevealed(r.roundId, r.spellId, r.spellParam, validLengths);
    }

    // revealClawConstraint function removed - CLAWDIA_CLAW spell doesn't exist in v3

    function seedJackpotBonus(uint256 roundId) external onlyOperator {
        Round storage r = rounds[roundId];
        require(r.jackpotTriggered, "Jackpot not triggered");
        require(r.jackpotBonus == 0, "Already seeded");

        uint256 bonus = (jackpotThreshold * jackpotBonusBps) / 10000;
        clawdiaToken.transferFrom(operator, address(this), bonus);
        r.jackpotBonus = bonus;

        emit JackpotSeeded(roundId, bonus);
    }

    // ═══════════════════════════════════════════
    //  PLAYER ACTIONS
    // ═══════════════════════════════════════════

    function commit(bytes32 commitHash, uint256 stakeAmount) external nonReentrant whenNotPaused {
        Round storage r = rounds[currentRoundId];

        require(block.timestamp >= r.startTime, "Round not open");
        require(block.timestamp < r.commitDeadline, "Commit phase closed");
        require(stakeAmount >= minStake, "Below minimum stake");
        require(commitments[currentRoundId][msg.sender].commitHash == bytes32(0), "Already committed");

        clawdiaToken.transferFrom(msg.sender, address(this), stakeAmount);

        commitments[currentRoundId][msg.sender] = Commitment({
            commitHash: commitHash,
            stake: stakeAmount,
            commitTime: block.timestamp,
            revealed: false,
            spellPass: false,
            lengthValid: false,
            fullyValid: false,
            consolation: false,
            wordLength: 0,
            effectiveScore: 0,
            payout: 0,
            claimed: false
        });

        r.totalStaked += stakeAmount;
        r.numCommits++;

        // Check jackpot threshold
        if (!r.jackpotTriggered && r.totalStaked >= jackpotThreshold) {
            r.jackpotTriggered = true;
            emit JackpotTriggered(currentRoundId, (jackpotThreshold * jackpotBonusBps) / 10000);
        }

        emit CommitSubmitted(currentRoundId, msg.sender, stakeAmount, block.timestamp, streakCount[msg.sender]);
    }

    function reveal(
        string calldata word,
        bytes32 salt,
        bytes32[] calldata dictProof,
        bytes32[] calldata categoryProof
    ) external nonReentrant {
        Round storage r = rounds[currentRoundId];
        Commitment storage c = commitments[currentRoundId][msg.sender];

        require(block.timestamp >= r.commitDeadline, "Reveal not open");
        require(block.timestamp < r.revealDeadline, "Reveal phase closed");
        require(c.commitHash != bytes32(0), "No commitment");
        require(!c.revealed, "Already revealed");

        // Verify commitment
        bytes32 expectedHash = keccak256(abi.encodePacked(currentRoundId, msg.sender, _normalize(word), salt));
        require(expectedHash == c.commitHash, "Commitment mismatch");

        // Verify dictionary
        require(dictionaryVerifier.verifyWord(dictProof, word), "Not in dictionary");

        // Verify letter pool
        require(_validLetterPool(word, r.letterPool), "Invalid letters");

        // v3 Validation: Two-variable system (spell + ruler lengths)
        bool passesSpell = spellEngine.validate(r.spellId, r.spellParam, word, categoryProof);
        bool lengthValid = spellRegistry.validateWordLength(bytes(word).length, r.validLengths);
        bool fullyValid = passesSpell && lengthValid;  // Both constraints must pass
        bool consolation = passesSpell && !lengthValid; // Spell pass, length miss

        c.revealed = true;
        c.spellPass = passesSpell;
        c.lengthValid = lengthValid;
        c.fullyValid = fullyValid;
        c.consolation = consolation;
        c.wordLength = uint16(bytes(word).length);

        // Calculate effective score with streak (only if passes spell)
        if (passesSpell) {
            uint256 multiplier = _getStreakMultiplier(msg.sender);
            c.effectiveScore = uint16((uint256(c.wordLength) * multiplier) / 100);
        } else {
            c.effectiveScore = 0;  // Failed spell = zero score
        }

        // Update streak (participation counts regardless of outcome)
        _updateStreak(msg.sender);

        r.numReveals++;

        // Insert into appropriate leaderboard based on v3 rules
        LeaderboardEntry memory entry = LeaderboardEntry({
            player: msg.sender,
            effectiveScore: c.effectiveScore,
            stake: c.stake,
            commitTime: c.commitTime
        });

        if (fullyValid) {
            // Valid winner: passed both spell AND length
            _insertSorted(topValid[currentRoundId], entry, _maxValidWinners(r.numReveals));
            r.validWinners++;
        } else if (consolation) {
            // Consolation: passed spell but failed length
            _insertSorted(topConsolation[currentRoundId], entry, _maxConsolationWinners(r.numReveals));
            r.consolationWinners++;
        }
        // If failed spell: no leaderboard, stake forfeited

        emit WordRevealed(currentRoundId, msg.sender, c.effectiveScore, passesSpell, lengthValid, fullyValid);
    }

    function finalizeRound() external nonReentrant {
        Round storage r = rounds[currentRoundId];
        require(block.timestamp >= r.revealDeadline, "Reveal not over");
        require(!r.finalized, "Already finalized");

        uint256 totalPot = r.totalStaked + r.jackpotBonus + rolloverAmount;

        // Apply rollover from previous rounds (if any)
        uint256 appliedRollover = rolloverAmount;
        if (rolloverAmount > 0) {
            emit RolloverApplied(currentRoundId, rolloverAmount);
            rolloverAmount = 0; // Reset after application
        }

        // Calculate fees
        uint256 burnAmount = (totalPot * burnBps) / 10000;
        uint256 stakerAmount = (totalPot * stakerBps) / 10000;
        uint256 opsAmount = (totalPot * operationsBps) / 10000;
        uint256 distributablePot = totalPot - burnAmount - stakerAmount - opsAmount;

        // Execute burn
        IERC20Burnable(address(clawdiaToken)).burn(burnAmount);
        globalBurnCounter += burnAmount;
        emit TokensBurned(currentRoundId, burnAmount, globalBurnCounter);

        // Staker rewards
        if (address(stakerDistributor) != address(0) && stakerAmount > 0) {
            clawdiaToken.transfer(address(stakerDistributor), stakerAmount);
            stakerDistributor.notifyReward(currentRoundId, stakerAmount);
            emit StakerRewardDistributed(currentRoundId, stakerAmount);
        }

        // Operations
        if (opsAmount > 0) {
            clawdiaToken.transfer(operator, opsAmount);
        }

        // Distribute payouts
        uint256 validPool = (distributablePot * 90) / 100;
        uint256 consolationPool = distributablePot - validPool;

        // Check if there are no valid winners - rollover validPool to next round
        if (topValid[currentRoundId].length == 0 && validPool > 0) {
            rolloverAmount += validPool;
            emit RolloverAdded(currentRoundId, validPool, rolloverAmount);
            // Don't distribute validPool, it will roll over
        } else {
            _distributePayouts(currentRoundId, topValid[currentRoundId], validPool, false);
        }

        _distributePayouts(currentRoundId, topConsolation[currentRoundId], consolationPool, true);

        r.finalized = true;
        emit RoundFinalized(currentRoundId, totalPot, burnAmount, uint32(topValid[currentRoundId].length));
    }

    function claimPayout(uint256 roundId) external nonReentrant {
        Commitment storage c = commitments[roundId][msg.sender];
        require(rounds[roundId].finalized, "Not finalized");
        require(c.payout > 0, "No payout");
        require(!c.claimed, "Already claimed");

        c.claimed = true;
        clawdiaToken.transfer(msg.sender, c.payout);

        emit PayoutClaimed(roundId, msg.sender, c.payout);
    }

    /// @notice Sweep unclaimed payouts after expiry period (only operator)
    /// @param roundId The round to sweep unclaimed payouts from
    /// @return sweptAmount The amount of tokens swept
    function sweepUnclaimedPayouts(uint256 roundId) external onlyOperator nonReentrant returns (uint256 sweptAmount) {
        Round storage r = rounds[roundId];
        require(r.finalized, "Round not finalized");
        require(block.timestamp >= r.revealDeadline + (payoutExpiryDays * 1 days), "Payout expiry not reached");

        // Calculate total unclaimed payouts for this round
        sweptAmount = 0;
        
        // Check all valid winners
        LeaderboardEntry[] storage validBoard = topValid[roundId];
        for (uint256 i = 0; i < validBoard.length; i++) {
            address player = validBoard[i].player;
            Commitment storage c = commitments[roundId][player];
            if (c.payout > 0 && !c.claimed) {
                sweptAmount += c.payout;
                c.claimed = true; // Mark as claimed to prevent future claims
            }
        }

        // Check all consolation winners
        LeaderboardEntry[] storage consolationBoard = topConsolation[roundId];
        for (uint256 i = 0; i < consolationBoard.length; i++) {
            address player = consolationBoard[i].player;
            Commitment storage c = commitments[roundId][player];
            if (c.payout > 0 && !c.claimed) {
                sweptAmount += c.payout;
                c.claimed = true; // Mark as claimed to prevent future claims
            }
        }

        // Transfer swept amount to operator
        if (sweptAmount > 0) {
            clawdiaToken.transfer(operator, sweptAmount);
            emit UnclaimedPayoutsSwept(roundId, sweptAmount, operator);
        }

        return sweptAmount;
    }

    // ═══════════════════════════════════════════
    //  INTERNAL HELPERS
    // ═══════════════════════════════════════════

    function _normalize(string calldata word) internal pure returns (string memory) {
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

    function _validLetterPool(string calldata word, bytes8 pool) internal pure returns (bool) {
        bytes memory w = bytes(word);
        uint8[26] memory available;

        // Count available letters (pool contains uppercase A-Z, convert to lowercase for comparison)
        for (uint i = 0; i < 8; i++) {  // Changed from 12 to 8
            uint8 letter = uint8(pool[i]);
            // Convert uppercase to lowercase
            if (letter >= 0x41 && letter <= 0x5A) {
                letter += 32; // Convert A-Z to a-z
            }
            if (letter >= 0x61 && letter <= 0x7a) {
                available[letter - 0x61]++;
            }
        }

        // v3: Check word uses only letters from pool (unlimited reuse allowed)
        for (uint i = 0; i < w.length; i++) {
            uint8 letter = uint8(w[i]);
            if (letter >= 0x41 && letter <= 0x5A) {
                letter += 32; // lowercase
            }
            if (letter < 0x61 || letter > 0x7a) return false;
            if (available[letter - 0x61] == 0) return false;
            // No decrement - letters can be reused unlimited times
        }
        return true;
    }

    function _getStreakMultiplier(address player) internal view returns (uint256) {
        uint256 streak = streakCount[player];
        if (lastParticipatedRound[player] == currentRoundId - 1) {
            streak++;
        } else if (lastParticipatedRound[player] != currentRoundId) {
            streak = 1;
        }

        if (streak >= 14) return 150;
        if (streak >= 7) return 125;
        if (streak >= 3) return 110;
        return 100;
    }

    function _updateStreak(address player) internal {
        if (lastParticipatedRound[player] == currentRoundId - 1) {
            streakCount[player]++;
        } else if (lastParticipatedRound[player] != currentRoundId) {
            streakCount[player] = 1;
        }
        lastParticipatedRound[player] = currentRoundId;
    }

    function _maxValidWinners(uint32 reveals) internal pure returns (uint256) {
        uint256 calculated = (uint256(reveals) * 10) / 100;
        return calculated < 3 ? 3 : calculated;
    }

    function _maxConsolationWinners(uint32 reveals) internal pure returns (uint256) {
        uint256 calculated = (uint256(reveals) * 5) / 100;
        return calculated < 1 ? 1 : calculated;
    }

    function _insertSorted(LeaderboardEntry[] storage board, LeaderboardEntry memory entry, uint256 maxSize) internal {
        // Find insertion point
        uint256 insertAt = board.length;
        for (uint256 i = 0; i < board.length; i++) {
            if (_compareEntries(entry, board[i])) {
                insertAt = i;
                break;
            }
        }

        if (insertAt >= maxSize) return; // Not good enough

        // Insert
        if (board.length < maxSize) {
            board.push(entry);
        }
        for (uint256 i = board.length - 1; i > insertAt; i--) {
            board[i] = board[i - 1];
        }
        board[insertAt] = entry;

        // Trim if needed
        while (board.length > maxSize) {
            board.pop();
        }
    }

    function _compareEntries(LeaderboardEntry memory a, LeaderboardEntry memory b) internal pure returns (bool aIsBetter) {
        if (a.effectiveScore != b.effectiveScore) return a.effectiveScore > b.effectiveScore;
        if (a.stake != b.stake) return a.stake > b.stake;
        return a.commitTime < b.commitTime;
    }

    function _distributePayouts(
        uint256 roundId,
        LeaderboardEntry[] storage board,
        uint256 pool,
        bool isConsolation
    ) internal {
        if (board.length == 0) return;

        uint256 totalWeight = 0;
        for (uint256 i = 0; i < board.length; i++) {
            totalWeight += board.length - i; // Higher rank = more weight
        }

        for (uint256 i = 0; i < board.length; i++) {
            uint256 weight = board.length - i;
            uint256 payout = (pool * weight) / totalWeight;

            // Consolation cap: can't profit, only recover stake
            if (isConsolation) {
                uint256 stake = commitments[roundId][board[i].player].stake;
                if (payout > stake) payout = stake;
            }

            commitments[roundId][board[i].player].payout = payout;
        }
    }

    // ═══════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════

    function setSpellEngine(address _engine) external onlyOwner {
        spellEngine = ISpellEngine(_engine);
    }

    function setDictionaryVerifier(address _verifier) external onlyOwner {
        dictionaryVerifier = IDictionaryVerifier(_verifier);
    }

    function setStakerDistributor(address _distributor) external onlyOwner {
        stakerDistributor = IStakerRewardDistributor(_distributor);
    }

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    /// @notice Swap the SpellRegistry address (emergency use: fix verifyRulerCommitment bugs)
    function setSpellRegistry(address _registry) external onlyOwner {
        spellRegistry = SpellRegistry(_registry);
    }

    /// @notice Fix a bad rulerCommitHash stored during openRound (use when hash was computed incorrectly)
    function overrideRulerCommitHash(uint256 roundId, bytes32 newHash) external onlyOwner {
        require(!rounds[roundId].finalized, "Round already finalized");
        rounds[roundId].rulerCommitHash = newHash;
    }

    /// @notice Emergency finalize a specific round (bypasses currentRoundId constraint)
    /// @dev Only valid after revealDeadline. Rolls valid pot to next round if no winners.
    function adminFinalizeRound(uint256 roundId) external onlyOwner nonReentrant {
        Round storage r = rounds[roundId];
        require(r.startTime > 0, "Round does not exist");
        require(block.timestamp >= r.revealDeadline, "Reveal not over");
        require(!r.finalized, "Already finalized");

        uint256 totalPot = r.totalStaked + r.jackpotBonus;
        uint256 burnAmount = (totalPot * burnBps) / 10000;
        uint256 stakerAmount = (totalPot * stakerBps) / 10000;
        uint256 opsAmount = (totalPot * operationsBps) / 10000;
        uint256 distributablePot = totalPot - burnAmount - stakerAmount - opsAmount;

        if (burnAmount > 0) {
            IERC20Burnable(address(clawdiaToken)).burn(burnAmount);
            globalBurnCounter += burnAmount;
        }
        if (stakerAmount > 0 && address(stakerDistributor) != address(0)) {
            clawdiaToken.transfer(address(stakerDistributor), stakerAmount);
            stakerDistributor.notifyReward(roundId, stakerAmount);
        }
        if (opsAmount > 0) {
            clawdiaToken.transfer(operator, opsAmount);
        }

        // No winner distribution — roll everything into next round rollover
        if (distributablePot > 0) {
            rolloverAmount += distributablePot;
        }

        r.finalized = true;
        emit RoundFinalized(roundId, totalPot, burnAmount, 0);
    }

    /// @notice Recover ERC20 tokens accidentally sent or stuck in this contract
    function recoverERC20(address token, uint256 amount, address to) external onlyOwner {
        IERC20(token).transfer(to, amount);
    }

    function setConfig(
        uint256 _minStake,
        uint16 _burnBps,
        uint16 _stakerBps,
        uint16 _operationsBps,
        uint256 _jackpotThreshold,
        uint16 _jackpotBonusBps,
        uint256 _payoutExpiryDays
    ) external onlyOwner {
        require(_burnBps + _stakerBps + _operationsBps <= 1000, "Fee too high");
        require(_payoutExpiryDays >= 7, "Expiry too short"); // Minimum 7 days
        minStake = _minStake;
        burnBps = _burnBps;
        stakerBps = _stakerBps;
        operationsBps = _operationsBps;
        treasuryFeeBps = _burnBps + _stakerBps + _operationsBps;
        jackpotThreshold = _jackpotThreshold;
        jackpotBonusBps = _jackpotBonusBps;
        payoutExpiryDays = _payoutExpiryDays;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ═══════════════════════════════════════════
    //  VIEW FUNCTIONS
    // ═══════════════════════════════════════════

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getCommitment(uint256 roundId, address player) external view returns (Commitment memory) {
        return commitments[roundId][player];
    }

    function getTopValid(uint256 roundId) external view returns (LeaderboardEntry[] memory) {
        return topValid[roundId];
    }

    function getTopConsolation(uint256 roundId) external view returns (LeaderboardEntry[] memory) {
        return topConsolation[roundId];
    }

    function getRolloverAmount() external view returns (uint256) {
        return rolloverAmount;
    }

    function getPayoutExpiryTimestamp(uint256 roundId) external view returns (uint256) {
        Round storage r = rounds[roundId];
        return r.revealDeadline + (payoutExpiryDays * 1 days);
    }

    function canSweepPayouts(uint256 roundId) external view returns (bool) {
        Round storage r = rounds[roundId];
        return r.finalized && block.timestamp >= r.revealDeadline + (payoutExpiryDays * 1 days);
    }
}
