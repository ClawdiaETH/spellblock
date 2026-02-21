-- SpellBlock Social Play Schema
-- Phase 1: off-chain player tracking, contract used for round lifecycle

CREATE TABLE IF NOT EXISTS sb_rounds (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL UNIQUE,
  letters VARCHAR(8) NOT NULL,
  commit_deadline BIGINT NOT NULL,
  reveal_deadline BIGINT NOT NULL,
  spell_id SMALLINT,
  spell_param VARCHAR(100),
  valid_lengths INTEGER[],
  seed VARCHAR(100),
  ruler_salt VARCHAR(100),
  status VARCHAR(20) DEFAULT 'open',   -- open | revealed | finalized
  round_tweet_id VARCHAR(100),
  round_cast_hash VARCHAR(100),
  total_collected BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sb_entries (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL,
  platform VARCHAR(20) NOT NULL,       -- twitter | farcaster
  handle VARCHAR(100) NOT NULL,
  word VARCHAR(50) NOT NULL,
  source_id VARCHAR(200),              -- tweet_id or cast_hash of the reply
  wallet VARCHAR(100),                 -- set after payment link used
  status VARCHAR(20) DEFAULT 'pending', -- pending | paid | valid | invalid | winner | consolation | refunded
  score INTEGER DEFAULT 0,
  spell_valid BOOLEAN,
  length_valid BOOLEAN,
  dict_valid BOOLEAN DEFAULT true,
  pool_valid BOOLEAN DEFAULT true,
  payment_tx VARCHAR(100),
  payment_amount BIGINT,
  payout_tx VARCHAR(100),
  payout_amount BIGINT,
  bot_replied BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(round_id, platform, handle)   -- one entry per handle per round
);

CREATE INDEX IF NOT EXISTS sb_entries_round_status ON sb_entries(round_id, status);
CREATE INDEX IF NOT EXISTS sb_entries_payment_tx ON sb_entries(payment_tx);
