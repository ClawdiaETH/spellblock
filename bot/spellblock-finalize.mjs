#!/usr/bin/env node
/**
 * SpellBlock Finalize
 * Runs after reveal deadline. No LLM.
 *
 * 1. Read spell + valid lengths from contract (revealed on-chain by reveal-seed-and-ruler.sh)
 * 2. Score all paid entries against spell + lengths
 * 3. Distribute prizes via Bankr to top valid winners, consolation to rest
 * 4. Post results to Twitter + Farcaster
 * 5. Finalize round in DB
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { scoreEntry } from './lib/validate.mjs';
import { db } from './lib/db.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const CONTRACT = '0x43F8658F3E85D1F92289e3036168682A9D14c683';
const RPC = 'https://base.drpc.org';
const FOUNDRY = '/Users/starl3xx/.foundry/bin';
const BOT_BANKR_HANDLE = 'ClawdiaBotAI';
const CLAWDIA_DECIMALS = 18n;

// Prize split: 60% top valid, 30% consolation, 10% ops (kept for gas/fees)
const VALID_PCT   = 60;
const CONSOL_PCT  = 30;
const OPS_PCT     = 10;

// Max winners (from contract logic)
const MAX_VALID   = 3;
const MAX_CONSOL  = 5;

function castCall(fn) {
  return execSync(`${FOUNDRY}/cast call ${CONTRACT} "${fn}" --rpc-url ${RPC}`, { shell: '/bin/bash' })
    .toString().trim();
}

function getNeynarKey() {
  return readFileSync(join(process.env.HOME, '.clawdbot/secrets/neynar_api_key'), 'utf8').trim();
}
function getSignerUuid() {
  return readFileSync(join(process.env.HOME, '.clawdbot/secrets/farcaster_signer_uuid'), 'utf8').trim();
}

function log(...a) { console.log('[finalize]', new Date().toISOString(), ...a); }

function bashEscape(s) {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

async function postTweet(text) {
  try {
    execSync(`~/clawd/skills/x-api/scripts/x-post.mjs ${bashEscape(text)}`, { shell: '/bin/bash' });
  } catch (e) { log('⚠️ Tweet failed:', e.message); }
}

async function postCast(text) {
  try {
    await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: { 'x-api-key': getNeynarKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ signer_uuid: getSignerUuid(), text }),
    });
  } catch (e) { log('⚠️ Cast failed:', e.message); }
}

// Send CLAWDIA via Bankr to a twitter handle
async function sendBankr(toHandle, amountClawdia, memo) {
  const text = `@bankrbot send ${amountClawdia} CLAWDIA @${toHandle} memo: ${memo}`;
  try {
    execSync(`~/clawd/skills/x-api/scripts/x-post.mjs ${bashEscape(text)}`, { shell: '/bin/bash' });
    log(`  💸 Sent ${amountClawdia} CLAWDIA → @${toHandle}`);
  } catch (e) {
    log(`  ❌ Bankr send failed for @${toHandle}:`, e.message);
  }
}

async function main() {
  log('Starting finalize');

  const round = await db.getCurrentRound();
  if (!round) { log('No open round'); await db.end(); return; }

  const now = Math.floor(Date.now() / 1000);
  if (now < round.reveal_deadline) {
    log(`Reveal deadline not yet reached (${Math.round((round.reveal_deadline - now) / 60)} min remaining)`);
    await db.end();
    return;
  }

  log(`Finalizing round ${round.round_id}`);

  // Get spell details from SeedAndRulerRevealed event
  const { createPublicClient, http, parseAbiItem } = await import('viem');
  const { base } = await import('viem/chains');
  const client = createPublicClient({ chain: base, transport: http(RPC) });
  const latest = await client.getBlockNumber();

  const seedLogs = await client.getLogs({
    address: CONTRACT,
    event: parseAbiItem('event SeedAndRulerRevealed(uint256 indexed roundId, uint8 spellId, bytes32 spellParam, uint8[3] validLengths)'),
    fromBlock: latest - 25000n, // ~14h of Base blocks (2s/block) covers reveal→finalize gap
    toBlock: 'latest',
  });

  const seedLog = seedLogs.filter(l => Number(l.args.roundId) === round.round_id).pop();

  let spellId = null;
  let spellParam = null;
  let validLengths = null;

  if (seedLog) {
    spellId = Number(seedLog.args.spellId);
    spellParam = Buffer.from((seedLog.args.spellParam || '0x').slice(2, 4), 'hex').toString('utf8');
    validLengths = Array.from(seedLog.args.validLengths).map(Number);
    log(`Spell: id=${spellId} param="${spellParam}" lengths=${validLengths.join('/')}`);
  } else {
    log('⚠️ No SeedAndRulerRevealed event found — scoring by letter pool + dict only (spell + ruler checks skipped)');
  }

  // Get all paid entries
  const entries = await db.getPaidEntries(round.round_id);
  log(`Paid entries: ${entries.length}`);

  if (entries.length === 0) {
    log('No paid entries — nothing to distribute');
    await db.finalizeRound(round.round_id);
    await db.end();
    return;
  }

  // Score each entry
  const scored = entries.map(e => {
    const result = (spellId !== null && validLengths)
      ? scoreEntry(e.word, round.letters, validLengths, spellId, spellParam)
      : { valid: true, score: e.word.length, reason: null };

    return { ...e, ...result };
  });

  // Update scores in DB
  for (const e of scored) {
    await db.updateScore(e.id, {
      score: e.score,
      spell_valid: e.spell_valid ?? e.valid,
      length_valid: e.length_valid ?? e.valid,
      status: e.valid ? 'valid' : 'invalid',
    });
  }

  // Separate valid vs consolation
  const valid = scored.filter(e => e.valid).sort((a, b) => b.score - a.score || a.created_at - b.created_at);
  const consol = scored.filter(e => !e.valid);

  log(`Valid: ${valid.length}, Consolation: ${consol.length}`);

  // Calculate pot — payment_amount is stored as raw CLAWDIA (e.g. 1000000), not wei
  const totalPaid = entries.reduce((sum, e) => sum + Number(e.payment_amount || 0), 0);
  const totalClawdia = totalPaid;

  log(`Total pot: ${totalClawdia} CLAWDIA`);

  const validPot   = Math.floor(totalClawdia * VALID_PCT  / 100);
  const consolPot  = Math.floor(totalClawdia * CONSOL_PCT / 100);

  // Distribute to top valid winners
  const topValid = valid.slice(0, MAX_VALID);
  if (topValid.length > 0) {
    const perWinner = Math.floor(validPot / topValid.length);
    for (const w of topValid) {
      await sendBankr(w.handle, perWinner, `SB-R${round.round_id}-WIN`);
      await db.updateScore(w.id, { score: w.score, spell_valid: true, length_valid: true, status: 'winner' });
    }
  } else {
    log('No valid winners — pot rolls to next round (held by bot)');
  }

  // Distribute consolation
  const topConsol = consol.slice(0, MAX_CONSOL);
  if (topConsol.length > 0) {
    const perConsol = Math.floor(consolPot / topConsol.length);
    for (const c of topConsol) {
      await sendBankr(c.handle, perConsol, `SB-R${round.round_id}-CONSOL`);
      await db.updateScore(c.id, { score: c.score, spell_valid: false, length_valid: false, status: 'consolation' });
    }
  }

  // Post results
  const winnerList = topValid.map((w, i) => `${i + 1}. @${w.handle} — ${w.word} (${w.score}pts)`).join('\n');
  const resultsText =
    `🔮 SpellBlock Round ${round.round_id} results!\n\n` +
    (topValid.length > 0
      ? `🏆 Winners:\n${winnerList}\n\nPrize: ${Math.floor(validPot / topValid.length).toLocaleString()} $CLAWDIA each`
      : `😔 No valid words this round — pot carries to Round ${round.round_id + 1}!`) +
    `\n\nTotal entries: ${entries.length} | spellblock.app`;

  await postTweet(resultsText);
  await postCast(resultsText);

  await db.finalizeRound(round.round_id);
  log('✅ Round finalized');
  await db.end();
}

main().catch(e => { console.error('[finalize] ❌', e.message); process.exit(1); });
