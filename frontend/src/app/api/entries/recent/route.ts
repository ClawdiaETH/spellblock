import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export async function GET(req: NextRequest) {
  const roundId = req.nextUrl.searchParams.get('r')
  if (!roundId) return NextResponse.json({ error: 'Missing round' }, { status: 400 })

  try {
    // If roundId is 'latest', find the max round with paid entries
    let resolvedRoundId = roundId
    if (roundId === 'latest') {
      const latest = await pool.query(
        `SELECT MAX(round_id) as r FROM sb_entries WHERE status='paid'`
      )
      resolvedRoundId = latest.rows[0]?.r ?? '0'
    }

    const result = await pool.query(
      `SELECT handle, payment_amount, created_at
       FROM sb_entries
       WHERE round_id=$1 AND status='paid'
       ORDER BY created_at DESC
       LIMIT 50`,
      [resolvedRoundId]
    )

    const entries = result.rows.map(row => ({
      handle: row.handle,
      stake: Number(row.payment_amount),   // raw CLAWDIA (e.g. 1000000)
      createdAt: row.created_at,
    }))

    return NextResponse.json({ entries }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (e: any) {
    console.error('[entries/recent] error:', e.message)
    return NextResponse.json({ entries: [] })
  }
}
