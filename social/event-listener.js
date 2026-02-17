#!/usr/bin/env node

/**
 * SpellBlock Event Listener
 * 
 * Watches SpellBlockGame contract for events and triggers social posts
 */

const { createPublicClient, http, parseAbiItem } = require('viem');
const { base } = require('viem/chains');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Contract address
const SPELLBLOCK_ADDRESS = '0xa596aAd2edCE7B5A64707D5Bf7921B640A2c26F9';
const RPC_URL = 'https://mainnet.base.org';

// State file to track last processed block
const STATE_FILE = path.join(__dirname, '.last-block.json');

// Initialize client
const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL)
});

// Event signatures
const EVENTS = {
  RoundOpened: parseAbiItem('event RoundOpened(uint256 indexed roundId, bytes8 letterPool, bytes32 rulerCommitHash, uint256 startTime)'),
  SeedRevealed: parseAbiItem('event SeedRevealed(uint256 indexed roundId, bytes8 letterPool, uint8 spellId, bytes32 spellParam, uint8[3] validLengths)'),
  RoundFinalized: parseAbiItem('event RoundFinalized(uint256 indexed roundId, uint256 totalPot, uint256 burnAmount, address[] winners)')
};

// Spell names
const SPELL_NAMES = {
  0: 'Veto',
  1: 'Anchor',
  2: 'Seal',
  3: 'Gem'
};

// Load last processed block
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return { lastBlock: null };
}

// Save last processed block
function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Decode letter pool from bytes8
function decodeLetterPool(bytes8) {
  // bytes8 is hex string like "0x4142434445464748"
  const hex = bytes8.slice(2); // Remove 0x
  let letters = '';
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substr(i, 2), 16);
    if (byte !== 0) {
      letters += String.fromCharCode(byte);
    }
  }
  return letters;
}

// Post to Twitter and Farcaster
function postToSocials(message) {
  console.log('\n📢 Posting to socials:');
  console.log(message);
  
  try {
    // Post to Twitter
    const twitterCmd = `~/clawd/skills/x-api/scripts/x-post.mjs "${message.replace(/"/g, '\\"')}"`;
    execSync(twitterCmd, { stdio: 'inherit' });
    
    // Post to Farcaster
    const farcasterCmd = `~/clawd/scripts/farcaster-cast.sh "${message.replace(/"/g, '\\"')}"`;
    execSync(farcasterCmd, { stdio: 'inherit' });
    
    console.log('✅ Posted to both platforms\n');
  } catch (error) {
    console.error('❌ Error posting:', error.message);
  }
}

// Handle RoundOpened event
function handleRoundOpened(event) {
  const { roundId, letterPool } = event.args;
  const letters = decodeLetterPool(letterPool);
  
  const message = `🎯 SpellBlock Round ${roundId} is LIVE

Letters: ${letters}
Prize Pool: Growing in $CLAWDIA

Hidden spell revealed after commits close:
• Veto, Anchor, Seal, or Gem?

Commit your word: spellblock.app
8 hours to play

@base mainnet ⚡️`;

  postToSocials(message);
}

// Handle SeedRevealed event
function handleSeedRevealed(event) {
  const { roundId, letterPool, spellId } = event.args;
  const letters = decodeLetterPool(letterPool);
  const spellName = SPELL_NAMES[spellId] || 'Unknown';
  
  // Get spell description
  const spellDescriptions = {
    'Veto': 'word cannot contain the vetoed letter',
    'Anchor': 'word must start with the anchor letter',
    'Seal': 'word must end with the seal letter',
    'Gem': 'word must have adjacent identical letters'
  };
  
  const message = `✨ Round ${roundId} SPELL REVEALED

${spellName}: ${spellDescriptions[spellName]}

Letters were: ${letters}
Reveal phase open for 4 hours

Who submitted the winning word? 👀

spellblock.app`;

  postToSocials(message);
}

// Handle RoundFinalized event
async function handleRoundFinalized(event) {
  const { roundId, totalPot, winners } = event.args;
  
  // Format CLAWDIA amount (assuming 18 decimals)
  const potAmount = (Number(totalPot) / 1e18).toLocaleString('en-US', {
    maximumFractionDigits: 0
  });
  
  const message = `🏆 Round ${roundId} COMPLETE

Winners: ${winners.length}
Total Prize Pool: ${potAmount} $CLAWDIA

Next round starts in 16 hours
Daily at 4PM UTC

spellblock.app on @base`;

  postToSocials(message);
}

// Main event polling loop
async function pollEvents() {
  const state = loadState();
  const currentBlock = await client.getBlockNumber();
  
  // Start from last processed block or 100 blocks ago
  const fromBlock = state.lastBlock ? BigInt(state.lastBlock) + 1n : currentBlock - 100n;
  
  console.log(`Checking blocks ${fromBlock} to ${currentBlock}...`);
  
  try {
    // Check for RoundOpened events
    const roundOpenedLogs = await client.getLogs({
      address: SPELLBLOCK_ADDRESS,
      event: EVENTS.RoundOpened,
      fromBlock,
      toBlock: currentBlock
    });
    
    for (const log of roundOpenedLogs) {
      console.log('📢 RoundOpened event detected');
      handleRoundOpened(log);
    }
    
    // Check for SeedRevealed events
    const seedRevealedLogs = await client.getLogs({
      address: SPELLBLOCK_ADDRESS,
      event: EVENTS.SeedRevealed,
      fromBlock,
      toBlock: currentBlock
    });
    
    for (const log of seedRevealedLogs) {
      console.log('📢 SeedRevealed event detected');
      handleSeedRevealed(log);
    }
    
    // Check for RoundFinalized events
    const roundFinalizedLogs = await client.getLogs({
      address: SPELLBLOCK_ADDRESS,
      event: EVENTS.RoundFinalized,
      fromBlock,
      toBlock: currentBlock
    });
    
    for (const log of roundFinalizedLogs) {
      console.log('📢 RoundFinalized event detected');
      await handleRoundFinalized(log);
    }
    
    // Save progress
    saveState({ lastBlock: Number(currentBlock) });
    
  } catch (error) {
    console.error('Error polling events:', error);
  }
}

// Run once and exit (cron will call again)
async function main() {
  console.log('🔍 SpellBlock Event Listener');
  console.log(`Contract: ${SPELLBLOCK_ADDRESS}`);
  console.log(`Network: Base mainnet\n`);
  
  await pollEvents();
  
  console.log('✅ Check complete\n');
}

main().catch(console.error);
