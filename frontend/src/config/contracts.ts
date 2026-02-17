import { base } from 'viem/chains'

export const CONTRACTS = {
  [base.id]: {
    // 2026-02-17: Updated deployment with vowel validation fix
    // Old addresses (2026-02-08): Core: 0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9
    spellBlockCore: '0xdfC4d2A4bde11B8C62D8a5bAa1a6E76fd2183592' as const, // SpellBlockGame with vowel validation
    spellBlockGame: '0xdfC4d2A4bde11B8C62D8a5bAa1a6E76fd2183592' as const, // Alias for spellBlockCore
    spellBlockTreasury: '0x6646cc7c5ff76b1363e46bAf584acB8d39C3488c' as const, // StakerRewardDistributor
    spellBlockScoring: '0x88cCddD3be7421aA030C571a747Fd0235523Cfd0' as const, // SpellRegistry
    clawdiaToken: '0xbbd9aDe16525acb4B336b6dAd3b9762901522B07' as const,
    dictionaryVerifier: '0xF86eD92C13d57E4b7D316DC56167258a8f68aE60' as const, // DictionaryVerifier
    streakTracker: '0x0000000000000000000000000000000000000000' as const, // Embedded in game
    seasonAccumulator: '0x0000000000000000000000000000000000000000' as const, // TBD
    spellEngine: '0x2262CFe461aF72fFA9a07aAf8a6dBA641692FFaE' as const, // SpellEngine
  },
}

export const SPELLBLOCK_CORE_ABI = [
  // Read functions
  { type: 'function', name: 'currentRoundId', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  // Try flat uint256 array approach - decode first 4 values for phase calculation
  { type: 'function', name: 'rounds', inputs: [{ name: 'roundId', type: 'uint256' }], outputs: [
    { type: 'uint256' }, // roundId
    { type: 'uint256' }, // startTime
    { type: 'uint256' }, // commitDeadline  
    { type: 'uint256' }, // revealDeadline
    { type: 'bytes32' }, // letterPool (padded)
    { type: 'bytes32' }, // rulerCommitHash
    { type: 'bytes32' }, // validLengths packed as bytes32
    { type: 'bytes32' }, // spellId + padding
    { type: 'bytes32' }, // spellParam
    { type: 'bytes32' }, // seedHash
    { type: 'bytes32' }, // revealedSeed
    { type: 'uint256' }, // totalPot
    { type: 'uint256' }, // commitCount
    { type: 'uint256' }, // revealCount
    { type: 'uint256' }, // rolloverFromPrevious
    { type: 'uint256' }, // jackpotBonus  
    { type: 'uint256' }, // phase (read as uint256 for safety)
  ], stateMutability: 'view' },
  { type: 'function', name: 'commitments', inputs: [{ name: 'roundId', type: 'uint256' }, { name: 'player', type: 'address' }], outputs: [{ type: 'tuple', components: [
    { name: 'commitHash', type: 'bytes32' },
    { name: 'stake', type: 'uint256' },
    { name: 'commitTimestamp', type: 'uint256' },
    { name: 'revealed', type: 'bool' },
    { name: 'forfeited', type: 'bool' },
  ]}], stateMutability: 'view' },
  { type: 'function', name: 'rolloverAmount', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  
  // Write functions  
  { type: 'function', name: 'commit', inputs: [{ name: 'commitHash', type: 'bytes32' }, { name: 'stake', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
  { type: 'function', name: 'reveal', inputs: [{ name: 'word', type: 'string' }, { name: 'salt', type: 'bytes32' }, { name: 'merkleProof', type: 'bytes32[]' }], outputs: [], stateMutability: 'nonpayable' },
  
  // Events
  { type: 'event', name: 'RoundStarted', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'startTime', type: 'uint256' }, { name: 'commitDeadline', type: 'uint256' }, { name: 'revealDeadline', type: 'uint256' }, { name: 'rulerCommitHash', type: 'bytes32' }] },
  { type: 'event', name: 'CommitSubmitted', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'stake', type: 'uint256' }, { name: 'timestamp', type: 'uint256' }, { name: 'streak', type: 'uint256' }] },
  { type: 'event', name: 'SeedRevealed', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'letterPool', type: 'bytes8' }, { name: 'spellId', type: 'uint8' }, { name: 'spellParam', type: 'bytes32' }, { name: 'validLengths', type: 'uint8[3]' }] },
  { type: 'event', name: 'PlayerRevealed', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'effectiveScore', type: 'uint256' }, { name: 'lengthValid', type: 'bool' }, { name: 'spellValid', type: 'bool' }] },
  { type: 'event', name: 'JackpotSeeded', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'bonusAmount', type: 'uint256' }, { name: 'newTotalPot', type: 'uint256' }] },
  { type: 'event', name: 'RoundFinalized', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'totalPot', type: 'uint256' }, { name: 'validWinnerCount', type: 'uint256' }, { name: 'consolationWinnerCount', type: 'uint256' }] },
] as const

export const SPELLBLOCK_TREASURY_ABI = [
  // Read functions
  { type: 'function', name: 'totalBurned', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalDistributedToStakers', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'totalDistributedToWinners', inputs: [], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  
  // Events
  { type: 'event', name: 'TokensBurned', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'amount', type: 'uint256' }, { name: 'newTotalBurned', type: 'uint256' }] },
  { type: 'event', name: 'PlayerPaid', inputs: [{ name: 'roundId', type: 'uint256', indexed: true }, { name: 'player', type: 'address', indexed: true }, { name: 'amount', type: 'uint256' }, { name: 'isConsolation', type: 'bool' }] },
] as const

export const STREAK_TRACKER_ABI = [
  // Read functions
  { type: 'function', name: 'streaks', inputs: [{ name: 'player', type: 'address' }], outputs: [{ type: 'tuple', components: [
    { name: 'lastRoundPlayed', type: 'uint256' },
    { name: 'currentStreak', type: 'uint256' },
  ]}], stateMutability: 'view' },
  { type: 'function', name: 'getMultiplier', inputs: [{ name: 'streak', type: 'uint256' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
] as const

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', inputs: [{ name: 'account', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'allowance', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }], stateMutability: 'view' },
  { type: 'function', name: 'approve', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }], stateMutability: 'nonpayable' },
  { type: 'function', name: 'decimals', inputs: [], outputs: [{ type: 'uint8' }], stateMutability: 'view' },
  { type: 'function', name: 'symbol', inputs: [], outputs: [{ type: 'string' }], stateMutability: 'view' },
] as const

export const SPELL_NAMES: Record<number, string> = {
  0: 'Veto',
  1: 'Anchor', 
  2: 'Seal',
  3: 'Gem',
}

export const SPELL_DESCRIPTIONS: Record<number, string> = {
  0: 'Word must NOT contain [letter]',
  1: 'Word must START with [letter]',
  2: 'Word must END with [letter]',
  3: 'Word must have adjacent identical letters',
}

// Alias for backward compatibility
export const SPELLBLOCK_ABI = SPELLBLOCK_CORE_ABI

// Force redeploy Tue Feb  3 23:39:56 CST 2026
