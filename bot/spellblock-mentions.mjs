#!/usr/bin/env node
/**
 * SpellBlock Twitter Mention Poller
 * Runs every 15 min via cron. Pure Node.js — zero LLM tokens.
 *
 * Flow:
 *  1. Load current open round from DB
 *  2. Search for replies to the round tweet since last check
 *  3. For each reply: validate word, create entry, reply with payment link
 *  4. Save last-seen tweet ID so we don't re-process
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { validateEntry } from './lib/validate.mjs';
import { db } from './lib/db.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(__dir, '../.state/mentions-last-id.txt');
const LOG_PREFIX = '[spellblock-mentions]';
const PAYMENT_BASE = 'https://spellblock.app/enter';
const BOT_HANDLE = 'ClawdiaBotAI';

// ── Auth ──────────────────────────────────────────────────────────────

function getToken() {
  try {
    return execSync('~/clawd/scripts/get-secret.sh x_oauth2_access_token', { shell: '/bin/bash' })
      .toString().trim();
  } catch {
    throw new Error('Could not load x_oauth2_access_token from keychain');
  }
}

async function apiGet(path, params = {}) {
  const url = new URL(`https://api.twitter.com/2/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });

  if (res.status === 401) {
    log('Token expired, triggering refresh...');
    try {
      const clientId = execSync('~/clawd/scripts/get-secret.sh x_oauth2_client_id', { shell: '/bin/bash' }).toString().trim();
      const clientSecret = execSync('~/clawd/scripts/get-secret.sh x_oauth2_client_secret', { shell: '/bin/bash' }).toString().trim();
      const refreshToken = execSync('security find-generic-password -s bagman-agent -a x_oauth2_refresh_token -w', { shell: '/bin/bash' }).toString().trim();
      const creds = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
      const refreshRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
      });
      if (refreshRes.ok) {
        const tokens = await refreshRes.json();
        execSync(`security add-generic-password -s bagman-agent -a x_oauth2_access_token -w "${tokens.access_token}" -U`, { shell: '/bin/bash' });
        if (tokens.refresh_token) {
          execSync(`security add-generic-password -s bagman-agent -a x_oauth2_refresh_token -w "${tokens.refresh_token}" -U`, { shell: '/bin/bash' });
          writeFileSync(`${process.env.HOME}/.clawdbot/secrets/x_oauth2_refresh_token`, tokens.refresh_token);
        }
        writeFileSync(`${process.env.HOME}/.clawdbot/secrets/x_oauth2_access_token`, tokens.access_token);
        log('✅ Token refreshed successfully');
      } else {
        log(`⚠️ Refresh failed: ${refreshRes.status}`);
      }
    } catch (e) {
      log(`⚠️ Refresh error: ${e.message}`);
    }
    // Retry once with new token
    const res2 = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (!res2.ok) throw new Error(`Twitter API ${res2.status}: ${await res2.text()}`);
    return res2.json();
  }

  if (!res.ok) throw new Error(`Twitter API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── State ─────────────────────────────────────────────────────────────

function loadLastId() {
  if (existsSync(STATE_FILE)) return readFileSync(STATE_FILE, 'utf8').trim() || null;
  return null;
}

function saveLastId(id) {
  const dir = join(__dir, '../.state');
  if (!existsSync(dir)) execSync(`mkdir -p ${dir}`);
  writeFileSync(STATE_FILE, id);
}

// ── Reply helpers ─────────────────────────────────────────────────────

function bashEscape(s) {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

async function postReply(tweet_id, text) {
  try {
    execSync(
      `~/clawd/skills/x-api/scripts/x-post.mjs --reply-to ${tweet_id} ${bashEscape(text)}`,
      { shell: '/bin/bash' }
    );
  } catch (e) {
    log(`⚠️ Reply failed: ${e.message}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────

function log(...args) {
  console.log(LOG_PREFIX, new Date().toISOString(), ...args);
}

async function main() {
  log('Starting mention scan');

  // 1. Load current round
  const round = await db.getCurrentRound();
  if (!round) {
    log('No open round found — skipping');
    await db.end();
    return;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now >= round.commit_deadline) {
    log(`Round ${round.round_id} commit deadline passed — no more entries`);
    await db.end();
    return;
  }

  if (!round.round_tweet_id) {
    log(`Round ${round.round_id} has no round_tweet_id in DB — skipping`);
    await db.end();
    return;
  }

  log(`Round ${round.round_id} | letters: ${round.letters} | tweet: ${round.round_tweet_id}`);

  // 2. Search replies to round tweet
  const lastId = loadLastId();
  const params = {
    query: `conversation_id:${round.round_tweet_id} is:reply -is:retweet`,
    'tweet.fields': 'author_id,created_at,text',
    'user.fields': 'username',
    expansions: 'author_id',
    max_results: 100,
  };
  if (lastId) params.since_id = lastId;

  let data;
  try {
    data = await apiGet('tweets/search/recent', params);
  } catch (e) {
    log(`❌ Search failed: ${e.message}`);
    await db.end();
    return;
  }

  const tweets = data.data || [];
  const users = {};
  for (const u of (data.includes?.users || [])) users[u.id] = u.username;

  log(`Found ${tweets.length} new repl${tweets.length === 1 ? 'y' : 'ies'}`);

  if (tweets.length === 0) {
    await db.end();
    return;
  }

  // Track newest ID to save at end
  let newestId = lastId;

  // Process oldest first (tweets come newest-first from API)
  for (const tweet of [...tweets].reverse()) {
    const handle = users[tweet.author_id];
    if (!handle) continue;
    if (handle.toLowerCase() === BOT_HANDLE.toLowerCase()) continue; // skip our own

    // Update newest ID tracker
    if (!newestId || BigInt(tweet.id) > BigInt(newestId)) newestId = tweet.id;

    // Extract first word-looking token from tweet text
    const rawWord = extractWord(tweet.text, round.letters);
    if (!rawWord) {
      log(`  @${handle}: no word found in "${tweet.text.slice(0, 60)}"`);
      continue;
    }

    log(`  @${handle}: "${rawWord}"`);

    // Check for duplicate entry
    const existing = await db.getEntry(round.round_id, 'twitter', handle);
    if (existing) {
      log(`  → duplicate (already have "${existing.word}")`);
      // Don't re-reply if already replied
      if (!existing.bot_replied) {
        await postReply(tweet.id,
          `@${handle} You already submitted "${existing.word}" this round! ` +
          `Pay to lock it in: ${PAYMENT_BASE}?r=${round.round_id}&w=${existing.word}&h=${handle}`
        );
        await db.markReplied(existing.id);
      }
      continue;
    }

    // Validate
    const { valid, reason } = validateEntry(rawWord, round.letters);

    if (!valid) {
      log(`  → invalid: ${reason}`);
      await postReply(tweet.id,
        `@${handle} "${rawWord.toUpperCase()}" doesn't work — ${reason}. ` +
        `Letters are ${round.letters}. Try again! 🔮`
      );
      continue;
    }

    // Create entry
    const entry = await db.createEntry({
      round_id: round.round_id,
      platform: 'twitter',
      handle,
      word: rawWord.toUpperCase(),
      source_id: tweet.id,
    });

    if (!entry) {
      log(`  → race condition duplicate, skipping`);
      continue;
    }

    // Reply with payment link
    const payUrl = `${PAYMENT_BASE}?r=${round.round_id}&w=${rawWord.toUpperCase()}&h=${encodeURIComponent(handle)}`;
    await postReply(tweet.id,
      `@${handle} ✅ "${rawWord.toUpperCase()}" looks good! ` +
      `Min 1,000,000 $CLAWDIA to enter (stake more = bigger pot):\n${payUrl}`
    );
    await db.markReplied(entry.id);

    log(`  → ✅ entry created, payment link sent`);
  }

  // Save last seen ID
  if (newestId) saveLastId(newestId);

  await db.end();
  log('Done');
}

/**
 * Extract the intended game word from a tweet.
 * Strips noise then tries each candidate against letter pool + dictionary —
 * returns the first word that actually validates (not just the first 4-letter token).
 * e.g. "I'm going with MITE" → skips "going" (not in pool), returns "MITE"
 */
function extractWord(text, letters) {
  const cleaned = text
    .replace(/@\w+/g, '')           // @mentions
    .replace(/https?:\/\/\S+/g, '') // URLs
    .replace(/#\w+/g, '')           // hashtags
    .replace(/[^a-zA-Z\s]/g, ' ')   // non-alpha
    .trim();

  const candidates = cleaned.split(/\s+/).filter(w => w.length >= 4 && /^[a-zA-Z]+$/.test(w));

  // If letters known: return first candidate that passes full validation
  if (letters) {
    for (const w of candidates) {
      const { valid } = validateEntry(w, letters);
      if (valid) return w.toUpperCase();
    }
    // Nothing validated — fall back to longest candidate (let main validation reject it with a reason)
    return candidates.sort((a, b) => b.length - a.length)[0]?.toUpperCase() || null;
  }

  // No letters context: return longest candidate as best guess
  return candidates.sort((a, b) => b.length - a.length)[0]?.toUpperCase() || null;
}

main().catch(e => {
  console.error(LOG_PREFIX, '❌ Fatal:', e.message);
  process.exit(1);
});
