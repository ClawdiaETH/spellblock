/**
 * DB helpers for SpellBlock social play
 * Reads DATABASE_URL from .env.local or environment
 */

import { readFileSync } from 'fs';
import { createPool } from '@vercel/postgres';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dir = dirname(fileURLToPath(import.meta.url));

function getConnectionString() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  try {
    const env = readFileSync(join(__dir, '../../frontend/.env.local'), 'utf8');
    const line = env.split('\n').find(l => l.startsWith('DATABASE_URL='));
    if (line) return line.split('=').slice(1).join('=').replace(/^"|"$/g, '');
  } catch {}
  throw new Error('DATABASE_URL not found');
}

const { Pool } = pg;
let _pool = null;
function pool() {
  if (!_pool) _pool = new Pool({ connectionString: getConnectionString(), ssl: { rejectUnauthorized: false } });
  return _pool;
}

export const db = {
  query: (sql, params) => pool().query(sql, params),
  end: () => _pool?.end(),

  // ── Round helpers ──────────────────────────────────────────────────

  async getCurrentRound() {
    const r = await pool().query(
      `SELECT * FROM sb_rounds WHERE status = 'open' ORDER BY round_id DESC LIMIT 1`
    );
    return r.rows[0] || null;
  },

  async upsertRound(data) {
    const { round_id, letters, commit_deadline, reveal_deadline,
            round_tweet_id, round_cast_hash } = data;
    await pool().query(`
      INSERT INTO sb_rounds (round_id, letters, commit_deadline, reveal_deadline, round_tweet_id, round_cast_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (round_id) DO UPDATE SET
        round_tweet_id = COALESCE(EXCLUDED.round_tweet_id, sb_rounds.round_tweet_id),
        round_cast_hash = COALESCE(EXCLUDED.round_cast_hash, sb_rounds.round_cast_hash),
        updated_at = NOW()
    `, [round_id, letters, commit_deadline, reveal_deadline, round_tweet_id, round_cast_hash]);
  },

  async revealRound(round_id, { spell_id, spell_param, valid_lengths, seed }) {
    await pool().query(`
      UPDATE sb_rounds SET status='revealed', spell_id=$2, spell_param=$3, valid_lengths=$4, seed=$5
      WHERE round_id=$1
    `, [round_id, spell_id, spell_param, valid_lengths, seed]);
  },

  async finalizeRound(round_id) {
    await pool().query(`UPDATE sb_rounds SET status='finalized' WHERE round_id=$1`, [round_id]);
  },

  // ── Entry helpers ──────────────────────────────────────────────────

  async getEntry(round_id, platform, handle) {
    const r = await pool().query(
      `SELECT * FROM sb_entries WHERE round_id=$1 AND platform=$2 AND handle=$3`,
      [round_id, platform, handle.toLowerCase()]
    );
    return r.rows[0] || null;
  },

  async createEntry({ round_id, platform, handle, word, source_id }) {
    try {
      const r = await pool().query(`
        INSERT INTO sb_entries (round_id, platform, handle, word, source_id)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (round_id, platform, handle) DO NOTHING
        RETURNING *
      `, [round_id, platform, handle.toLowerCase(), word.toUpperCase(), source_id]);
      return r.rows[0] || null; // null = duplicate
    } catch (e) {
      if (e.code === '23505') return null; // unique violation
      throw e;
    }
  },

  async markReplied(entry_id) {
    await pool().query(`UPDATE sb_entries SET bot_replied=true WHERE id=$1`, [entry_id]);
  },

  async markPaid(entry_id, { wallet, payment_tx, payment_amount }) {
    await pool().query(`
      UPDATE sb_entries SET status='paid', wallet=$2, payment_tx=$3, payment_amount=$4
      WHERE id=$1
    `, [entry_id, wallet, payment_tx, payment_amount]);
  },

  async getPaidEntries(round_id) {
    const r = await pool().query(
      `SELECT * FROM sb_entries WHERE round_id=$1 AND status='paid' ORDER BY created_at ASC`,
      [round_id]
    );
    return r.rows;
  },

  async updateScore(entry_id, { score, spell_valid, length_valid, status }) {
    await pool().query(`
      UPDATE sb_entries SET score=$2, spell_valid=$3, length_valid=$4, status=$5
      WHERE id=$1
    `, [entry_id, score, spell_valid, length_valid, status]);
  },

  async markPaid_byTx(tx_hash, { wallet, amount }) {
    const r = await pool().query(`
      UPDATE sb_entries SET status='paid', wallet=$2, payment_tx=$1, payment_amount=$3
      WHERE payment_tx IS NULL
        AND handle = (SELECT handle FROM sb_entries WHERE payment_tx IS NULL ORDER BY created_at DESC LIMIT 1)
      RETURNING *
    `, [tx_hash, wallet, amount]);
    return r.rows[0];
  },
};
