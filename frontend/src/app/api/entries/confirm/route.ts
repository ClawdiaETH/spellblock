import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export async function POST(req: NextRequest) {
  try {
    const { round_id, word, handle, wallet, tx_hash, stake_clawdia } = await req.json()

    if (!round_id || !word || !handle || !wallet || !tx_hash) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    // Find the pending entry
    const existing = await pool.query(
      `SELECT * FROM sb_entries WHERE round_id=$1 AND handle=$2 AND word=$3`,
      [round_id, handle.toLowerCase(), word.toUpperCase()]
    )

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }

    const entry = existing.rows[0]

    // Idempotent: already confirmed
    if (entry.status === 'paid') {
      return NextResponse.json({ ok: true, already: true })
    }

    // Check for duplicate tx_hash (replay protection)
    const dupeCheck = await pool.query(
      `SELECT id FROM sb_entries WHERE payment_tx=$1`, [tx_hash]
    )
    if (dupeCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Transaction already used' }, { status: 409 })
    }

    // Mark as paid
    // stake_clawdia is the human-readable CLAWDIA amount (e.g. 1000000)
    // Store as-is — payment_amount is bigint, wei would overflow it
    const amountRaw = stake_clawdia
      ? Math.floor(Number(stake_clawdia))
      : 1_000_000

    await pool.query(`
      UPDATE sb_entries
      SET status='paid', wallet=$2, payment_tx=$3, payment_amount=$4
      WHERE id=$1
    `, [entry.id, wallet.toLowerCase(), tx_hash, amountRaw])

    console.log(`[entries/confirm] Round ${round_id} | @${handle} | ${word} | tx:${tx_hash}`)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[entries/confirm] error:', e.message)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
