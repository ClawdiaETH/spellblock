import { Pool } from 'pg'

let pool: Pool | null = null

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL
    
    if (!connectionString) {
      throw new Error('DATABASE_URL or POSTGRES_URL not set')
    }
    
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    })
  }
  
  return pool
}

export interface CommitRecord {
  id: number
  round_id: string
  player_address: string
  word_encrypted: string
  salt_encrypted: string
  commit_hash: string
  revealed: boolean
  reveal_tx_hash: string | null
  created_at: Date
  revealed_at: Date | null
}

/**
 * Save a new commit to the database
 */
export async function saveCommit(data: {
  roundId: string
  playerAddress: string
  wordEncrypted: string
  saltEncrypted: string
  commitHash: string
}): Promise<void> {
  const pool = getPool()
  
  await pool.query(
    `INSERT INTO commits (round_id, player_address, word_encrypted, salt_encrypted, commit_hash)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (round_id, player_address) 
     DO UPDATE SET 
       word_encrypted = EXCLUDED.word_encrypted,
       salt_encrypted = EXCLUDED.salt_encrypted,
       commit_hash = EXCLUDED.commit_hash,
       created_at = NOW()`,
    [data.roundId, data.playerAddress.toLowerCase(), data.wordEncrypted, data.saltEncrypted, data.commitHash]
  )
}

/**
 * Get all unrevealed commits for a round
 */
export async function getUnrevealedCommits(roundId: string): Promise<CommitRecord[]> {
  const pool = getPool()
  
  const result = await pool.query<CommitRecord>(
    `SELECT * FROM commits 
     WHERE round_id = $1 AND revealed = FALSE
     ORDER BY created_at ASC`,
    [roundId]
  )
  
  return result.rows
}

/**
 * Mark a commit as revealed
 */
export async function markRevealed(roundId: string, playerAddress: string, txHash: string): Promise<void> {
  const pool = getPool()
  
  await pool.query(
    `UPDATE commits 
     SET revealed = TRUE, reveal_tx_hash = $3, revealed_at = NOW()
     WHERE round_id = $1 AND player_address = $2`,
    [roundId, playerAddress.toLowerCase(), txHash]
  )
}

/**
 * Check if address has committed for a round
 */
export async function hasCommitted(roundId: string, playerAddress: string): Promise<boolean> {
  const pool = getPool()
  
  const result = await pool.query(
    `SELECT 1 FROM commits WHERE round_id = $1 AND player_address = $2 LIMIT 1`,
    [roundId, playerAddress.toLowerCase()]
  )
  
  return result.rows.length > 0
}

/**
 * Rate limiting: check if address can make request
 */
export async function checkRateLimit(address: string, maxRequests: number = 5, windowMinutes: number = 1): Promise<boolean> {
  const pool = getPool()
  
  // Clean up old entries
  await pool.query(
    `DELETE FROM api_rate_limits WHERE window_start < NOW() - INTERVAL '${windowMinutes} minutes'`
  )
  
  // Check current count
  const result = await pool.query(
    `SELECT request_count FROM api_rate_limits WHERE address = $1`,
    [address.toLowerCase()]
  )
  
  if (result.rows.length === 0) {
    // First request in window
    await pool.query(
      `INSERT INTO api_rate_limits (address, request_count, window_start) VALUES ($1, 1, NOW())`,
      [address.toLowerCase()]
    )
    return true
  }
  
  const count = result.rows[0].request_count
  
  if (count >= maxRequests) {
    return false // Rate limited
  }
  
  // Increment count
  await pool.query(
    `UPDATE api_rate_limits SET request_count = request_count + 1 WHERE address = $1`,
    [address.toLowerCase()]
  )
  
  return true
}
