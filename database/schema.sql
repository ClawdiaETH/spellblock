-- SpellBlock Auto-Reveal Database Schema
-- PostgreSQL (Neon)

CREATE TABLE IF NOT EXISTS commits (
  id SERIAL PRIMARY KEY,
  round_id BIGINT NOT NULL,
  player_address TEXT NOT NULL,
  word_encrypted TEXT NOT NULL,
  salt_encrypted TEXT NOT NULL,
  commit_hash TEXT NOT NULL,
  revealed BOOLEAN DEFAULT FALSE,
  reveal_tx_hash TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  revealed_at TIMESTAMP,
  
  -- Prevent duplicate commits
  UNIQUE(round_id, player_address)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_commits_round ON commits(round_id);
CREATE INDEX IF NOT EXISTS idx_commits_unrevealed ON commits(round_id, revealed) WHERE revealed = FALSE;
CREATE INDEX IF NOT EXISTS idx_commits_player ON commits(player_address);

-- API rate limiting table
CREATE TABLE IF NOT EXISTS api_rate_limits (
  address TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP DEFAULT NOW()
);

-- Cleanup old rate limit entries (keep last hour)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON api_rate_limits(window_start);
