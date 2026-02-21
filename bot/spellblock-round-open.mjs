#!/usr/bin/env node
/**
 * SpellBlock Round Open
 * Called by cron (or manually). Reads round data from contract,
 * posts to Twitter + FC, stores tweet/cast IDs in DB.
 *
 * The contract openRound() is still called by the shell script (open-round.sh).
 * This script handles the social + DB side after the round is live on-chain.
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { db } from './lib/db.mjs';

const __dir = dirname(fileURLToPath(import.meta.url));
const CONTRACT = '0x43F8658F3E85D1F92289e3036168682A9D14c683';
const RPC = 'https://mainnet.base.org';
const FOUNDRY = '/Users/starl3xx/.foundry/bin';

function cast(args) {
  return execSync(`${FOUNDRY}/cast ${args} --rpc-url ${RPC}`, { shell: '/bin/bash' })
    .toString().trim();
}

function getSecret(key) {
  return execSync(`~/clawd/scripts/get-secret.sh ${key}`, { shell: '/bin/bash' }).toString().trim();
}

function getNeynarKey() {
  return readFileSync(join(process.env.HOME, '.clawdbot/secrets/neynar_api_key'), 'utf8').trim();
}

function getSignerUuid() {
  return readFileSync(join(process.env.HOME, '.clawdbot/secrets/farcaster_signer_uuid'), 'utf8').trim();
}

function log(...a) { console.log('[round-open]', new Date().toISOString(), ...a); }

async function postTweet(text) {
  try {
    const out = execSync(
      `~/clawd/skills/x-api/scripts/x-post.mjs ${JSON.stringify(text)}`,
      { shell: '/bin/bash' }
    ).toString();
    // Extract tweet ID from URL in output
    const match = out.match(/status\/(\d+)/);
    return match?.[1] || null;
  } catch (e) {
    log('⚠️ Tweet failed:', e.message);
    return null;
  }
}

async function postCast(text, channelId = 'base') {
  try {
    const res = await fetch('https://api.neynar.com/v2/farcaster/cast', {
      method: 'POST',
      headers: { 'x-api-key': getNeynarKey(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ signer_uuid: getSignerUuid(), text, channel_id: channelId }),
    });
    const data = await res.json();
    return data.cast?.hash || null;
  } catch (e) {
    log('⚠️ Cast failed:', e.message);
    return null;
  }
}

async function main() {
  log('Checking contract for open round...');

  // Read current round from contract
  const roundId = parseInt(cast(`call ${CONTRACT} "currentRoundId()(uint256)"`));
  if (!roundId) { log('No round open on contract'); await db.end(); return; }

  // Check if already in DB
  const existing = await db.getCurrentRound();
  if (existing?.round_id === roundId && existing?.round_tweet_id) {
    log(`Round ${roundId} already in DB with tweet ID — skipping`);
    await db.end();
    return;
  }

  // Read round struct from contract (fields 2,3,4 = startTime, commitDeadline, revealDeadline)
  const fields = cast(`call ${CONTRACT} "rounds(uint256)(uint256,uint256,uint256,uint256)" ${roundId}`)
    .split('\n').map(s => s.trim());

  const commitDeadline = parseInt(fields[2]);
  const revealDeadline = parseInt(fields[3]);

  // Get letter pool from RoundOpened event
  const { createPublicClient, http, parseAbiItem } = await import('viem');
  const { base } = await import('viem/chains');
  const client = createPublicClient({ chain: base, transport: http(RPC) });
  const latest = await client.getBlockNumber();
  const logs = await client.getLogs({
    address: CONTRACT,
    event: parseAbiItem('event RoundOpened(uint256 indexed roundId, bytes8 letterPool, bytes32 rulerCommitHash, uint256 startTime)'),
    fromBlock: latest - 5000n,
    toBlock: 'latest',
  });

  const roundLog = logs.filter(l => Number(l.args.roundId) === roundId).pop();
  if (!roundLog) { log('❌ Could not find RoundOpened event'); await db.end(); return; }

  const letters = Buffer.from(roundLog.args.letterPool.slice(2), 'hex').toString('utf8').replace(/\0/g, '');
  log(`Round ${roundId} | letters: ${letters} | commit deadline: ${new Date(commitDeadline * 1000).toISOString()}`);

  // Upsert round in DB (without tweet IDs yet)
  await db.upsertRound({ round_id: roundId, letters, commit_deadline: commitDeadline, reveal_deadline: revealDeadline });

  // Compose post text
  const commitDtStr = new Date(commitDeadline * 1000).toUTCString().replace(' GMT', ' UTC');
  const text =
    `🔮 SpellBlock Round ${roundId} is LIVE!\n\n` +
    `Letters: ${letters.split('').join(' ')}\n` +
    `Spell: 🔒 revealed at ${commitDtStr}\n\n` +
    `Reply with your best word to enter.\n` +
    `Min stake: 1,000,000 $CLAWDIA | spellblock.app`;

  // Post to Twitter
  log('Posting to Twitter...');
  const tweetId = await postTweet(text);
  log(tweetId ? `✅ Tweet: ${tweetId}` : '⚠️ Tweet failed');

  // Post to Farcaster
  log('Posting to Farcaster...');
  const castHash = await postCast(text);
  log(castHash ? `✅ Cast: ${castHash}` : '⚠️ Cast failed');

  // Update DB with social IDs (pollers need these to find replies)
  await db.upsertRound({
    round_id: roundId,
    letters,
    commit_deadline: commitDeadline,
    reveal_deadline: revealDeadline,
    round_tweet_id: tweetId,
    round_cast_hash: castHash,
  });

  log(`Round ${roundId} fully open. Pollers will now track replies.`);
  await db.end();
}

main().catch(e => { console.error('[round-open] ❌', e.message); process.exit(1); });
