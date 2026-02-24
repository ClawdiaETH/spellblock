#!/usr/bin/env node
/**
 * SpellBlock Social Reveal
 * Runs after reveal-seed-and-ruler.sh at 08:00 UTC (2 AM CT).
 * Reads the revealed spell + valid lengths from the contract event log,
 * then posts the reveal announcement to Twitter + Farcaster.
 *
 * Pure Node.js — zero LLM tokens.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { db } from './lib/db.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const CONTRACT = '0x43F8658F3E85D1F92289e3036168682A9D14c683';
const RPC = 'https://base.drpc.org';

const SPELL_NAMES = {
  0: { name: 'Veto 🚫',  desc: (p) => `word must NOT contain ${p}` },
  1: { name: 'Anchor ⚓', desc: (p) => `word must START with ${p}` },
  2: { name: 'Seal 🔒',   desc: (p) => `word must END with ${p}` },
  3: { name: 'Gem 💎',    desc: () => 'word must contain double letters (e.g. LL, OO)' },
};

function log(...a) { console.log('[social-reveal]', new Date().toISOString(), ...a); }

function bashEscape(s) {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

function getNeynarKey() {
  return readFileSync(join(process.env.HOME, '.clawdbot/secrets/neynar_api_key'), 'utf8').trim();
}

function getSignerUuid() {
  return readFileSync(join(process.env.HOME, '.clawdbot/secrets/farcaster_signer_uuid'), 'utf8').trim();
}

async function postTweet(text) {
  try {
    const out = execSync(
      `~/clawd/skills/x-api/scripts/x-post.mjs ${bashEscape(text)}`,
      { shell: '/bin/bash' }
    ).toString();
    const match = out.match(/status\/(\d+)/);
    const id = match?.[1] || null;
    log(id ? `✅ Tweet: ${id}` : '⚠️ Tweet posted but no ID found');
    return id;
  } catch (e) {
    log('⚠️ Tweet failed:', e.message);
    return null;
  }
}

async function postCast(text, channelId = 'ai') {
  try {
    const res = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: { 'x-api-key': getNeynarKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ signer_uuid: getSignerUuid(), text, channel_id: channelId }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    log(data.cast?.hash ? `✅ Cast: ${data.cast.hash}` : '⚠️ Cast posted but no hash found');
    return data.cast?.hash || null;
  } catch (e) {
    log('⚠️ Cast failed:', e.message);
    return null;
  }
}

async function main() {
  log('Reading revealed spell from contract events...');

  const { createPublicClient, http, parseAbiItem } = await import('viem');
  const { base } = await import('viem/chains');
  const client = createPublicClient({ chain: base, transport: http(RPC) });

  // Get current round from DB
  const round = await db.getCurrentRound();
  if (!round) { log('No open round in DB'); await db.end(); return; }

  const roundId = round.round_id;
  log(`Round ${roundId} | letters: ${round.letters}`);

  // Read SeedAndRulerRevealed event from contract
  const latest = await client.getBlockNumber();
  const logs = await client.getLogs({
    address: CONTRACT,
    event: parseAbiItem(
      'event SeedAndRulerRevealed(uint256 indexed roundId, uint8 spellId, bytes32 spellParam, uint8[3] validLengths)'
    ),
    fromBlock: latest - 25000n, // ~14h of Base blocks; covers the reveal→post window
    toBlock: 'latest',
  });

  const revealLog = logs.filter(l => Number(l.args.roundId) === roundId).pop();
  if (!revealLog) {
    log('❌ No SeedAndRulerRevealed event found — round not yet revealed or event window too narrow');
    await db.end();
    return;
  }

  const spellId = Number(revealLog.args.spellId);
  // spellParam is bytes32 — extract first non-zero byte as the spell letter
  const spellParamHex = revealLog.args.spellParam; // bytes32 hex e.g. "0x4b00..."
  const spellParam = Buffer.from(spellParamHex.slice(2, 4), 'hex').toString('utf8').toUpperCase();
  const validLengths = revealLog.args.validLengths.map(Number);

  const spell = SPELL_NAMES[spellId] ?? { name: `Spell #${spellId}`, desc: () => '???' };
  const spellDesc = spell.desc(spellParam);

  log(`Spell: id=${spellId} "${spell.name}" param="${spellParam}" → ${spellDesc}`);
  log(`Valid lengths: ${validLengths.join(', ')}`);

  // Compose announcement
  const text =
    `🔮 SpellBlock Round ${roundId} — Spell + Ruler revealed!\n\n` +
    `${spell.name}: ${spellDesc}\n` +
    `📏 Valid lengths: ${validLengths.join(', ')}\n\n` +
    `Scoring + payouts happen automatically at 15:45 UTC (9:45 AM CT).\n\n` +
    `spellblock.app`;

  log('Posting reveal announcement...');
  log('Text:', text);

  await postTweet(text);
  await postCast(text, 'ai');

  await db.end();
  log('Done');
}

main().catch(e => {
  console.error('[social-reveal] ❌', e.message);
  process.exit(1);
});
