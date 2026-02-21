import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })

export async function GET(req: NextRequest) {
  const roundId = req.nextUrl.searchParams.get('r')
  if (!roundId) return NextResponse.json({ error: 'Missing round' }, { status: 400 })

  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(payment_amount), 0) as pot
       FROM sb_entries
       WHERE round_id=$1 AND status='paid'`,
      [roundId]
    )
    const row = result.rows[0]
    const count = parseInt(row.count, 10)
    // payment_amount stored as wei (18 decimals) — convert to whole CLAWDIA
    const potWei = BigInt(row.pot)
    const potClawdia = Number(potWei / 10n ** 18n)
    return NextResponse.json({ count, pot: potClawdia }, {
      headers: { 'Cache-Control': 'no-store' }
    })
  } catch (e: any) {
    console.error('[entries/stats] error:', e.message)
    return NextResponse.json({ count: 0, pot: 0 })
  }
}
