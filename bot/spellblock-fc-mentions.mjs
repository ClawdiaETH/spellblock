#!/usr/bin/env node
/**
 * SpellBlock Farcaster Mention Poller
 * Runs every 15 min via cron. Pure Node.js — zero LLM tokens.
 * Uses Neynar API to get replies to the round cast.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { validateEntry } from './lib/validate.mjs';
import { db } from './lib/db.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dir, '../.state/fc-mentions-cursor.txt');
const LOG_PREFIX = '[spellblock-fc]';
const PAYMENT_BASE = 'https://spellblock.app/enter';
const BOT_FID = '2540768'; // @clawdia FID

function getNeynarKey() {
  try {
    return readFileSync(join(process.env.HOME, '.clawdbot/secrets/neynar_api_key'), 'utf8').trim();
  } catch {
    throw new Error('neynar_api_key not found');
  }
}

function getSignerUuid() {
  try {
    return readFileSync(join(process.env.HOME, '.clawdbot/secrets/farcaster_signer_uuid'), 'utf8').trim();
  } catch {
    throw new Error('farcaster_signer_uuid not found');
  }
}

async function neynar(path, params = {}) {
  const url = new URL(`https://api.neynar.com/v2/farcaster/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'x-api-key': getNeynarKey() } });
  if (!res.ok) throw new Error(`Neynar ${res.status}: ${await res.text()}`);
  return res.json();
}

async function postReplyCast(parentHash, text) {
  try {
    const res = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: { 'x-api-key': getNeynarKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signer_uuid: getSignerUuid(),
        text,
        parent: parentHash,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return data.cast?.hash;
  } catch (e) {
    log(`⚠️ FC reply failed: ${e.message}`);
    return null;
  }
}

function extractWord(text) {
  const cleaned = text
    .replace(/@\w+/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#\w+/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim();
  const words = cleaned.split(/\s+/).filter(w => w.length >= 4 && /^[a-zA-Z]+$/.test(w));
  return words[0] || null;
}

function loadCursor(castHash) {
  if (existsSync(STATE_FILE)) {
    const content = readFileSync(STATE_FILE, 'utf8').trim();
    if (!content) return null;
    const lines = content.split('\n');
    const storedHash = lines[0];
    const cursor = lines[1] || null;
    if (storedHash === castHash) return cursor;
  }
  return null;
}

function saveCursor(castHash, cursor) {
  const dir = join(__dir, '../.state');
  if (!existsSync(dir)) execSync(`mkdir -p ${dir}`);
  writeFileSync(STATE_FILE, `${castHash}\n${cursor}`);
}

function log(...args) { console.log(LOG_PREFIX, new Date().toISOString(), ...args); }

async function main() {
  log('Starting FC mention scan');

  const round = await db.getCurrentRound();
  if (!round) { log('No open round'); await db.end(); return; }

  const now = Math.floor(Date.now() / 1000);
  if (now >= round.commit_deadline) { log('Commit deadline passed'); await db.end(); return; }
  if (!round.round_cast_hash) { log('No round_cast_hash in DB'); await db.end(); return; }

  log(`Round ${round.round_id} | cast: ${round.round_cast_hash}`);

  // Get replies to the round cast via conversation endpoint
  const cursor = loadCursor(round.round_cast_hash);
  const params = { conversation_identifier: round.round_cast_hash, type: 'cast', reply_depth: 1, limit: 50 };
  if (cursor) params.cursor = cursor;

  let data;
  try {
    data = await neynar('cast/conversation', params);
  } catch (e) {
    log(`❌ Neynar failed: ${e.message}`);
    await db.end();
    return;
  }

  const replies = data.conversation?.cast?.direct_replies || [];
  log(`Found ${replies.length} replies`);

  let newCursor = data.next?.cursor;

  for (const cast of replies) {
    const handle = cast.author?.username;
    const fid = cast.author?.fid?.toString();
    if (!handle || fid === BOT_FID) continue;

    const rawWord = extractWord(cast.text);
    if (!rawWord) { log(`  @${handle}: no word found`); continue; }

    log(`  @${handle}: "${rawWord}"`);

    const existing = await db.getEntry(round.round_id, 'farcaster', handle);
    if (existing) {
      if (!existing.bot_replied) {
        await postReplyCast(cast.hash,
          `@${handle} you already have "${existing.word}" queued! ` +
          `Pay here to lock in: ${PAYMENT_BASE}?r=${round.round_id}&w=${existing.word}&h=${handle}`
        );
        await db.markReplied(existing.id);
      }
      continue;
    }

    const { valid, reason } = validateEntry(rawWord, round.letters);

    if (!valid) {
      log(`  → invalid: ${reason}`);
      await postReplyCast(cast.hash,
        `@${handle} "${rawWord.toUpperCase()}" doesn't work — ${reason}. ` +
        `Letters are ${round.letters} 🔮`
      );
      continue;
    }

    const entry = await db.createEntry({
      round_id: round.round_id,
      platform: 'farcaster',
      handle,
      word: rawWord.toUpperCase(),
      source_id: cast.hash,
    });

    if (!entry) { log(`  → duplicate`); continue; }

    const payUrl = `${PAYMENT_BASE}?r=${round.round_id}&w=${rawWord.toUpperCase()}&h=${encodeURIComponent(handle)}`;
    await postReplyCast(cast.hash,
      `@${handle} ✅ "${rawWord.toUpperCase()}" looks good! ` +
      `Min 1,000,000 $CLAWDIA to enter (stake more = bigger pot): ${payUrl}`
    );
    await db.markReplied(entry.id);
    log(`  → ✅ entry created`);
  }

  if (newCursor) saveCursor(round.round_cast_hash, newCursor);
  await db.end();
  log('Done');
}

main().catch(e => {
  console.error(LOG_PREFIX, '❌ Fatal:', e.message);
  process.exit(1);
});
