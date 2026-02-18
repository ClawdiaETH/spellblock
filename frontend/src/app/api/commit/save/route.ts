import { NextRequest, NextResponse } from 'next/server'
import { verifyMessage } from 'viem'
import { encrypt } from '@/lib/backend/crypto'
import { saveCommit, checkRateLimit } from '@/lib/backend/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface SaveCommitRequest {
  roundId: string
  address: string
  word: string
  salt: string
  commitHash: string
  signature: string // Wallet signature of commitHash
}

export async function POST(request: NextRequest) {
  try {
    const body: SaveCommitRequest = await request.json()
    
    // Validate required fields
    if (!body.roundId || !body.address || !body.word || !body.salt || !body.commitHash || !body.signature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Normalize address
    const address = body.address.toLowerCase()
    
    // Rate limiting
    const allowed = await checkRateLimit(address, 5, 1)
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in 1 minute.' },
        { status: 429 }
      )
    }
    
    // Verify signature (player signed their commitHash to prove ownership)
    let valid = false
    try {
      valid = await verifyMessage({
        address: body.address as `0x${string}`,
        message: body.commitHash,
        signature: body.signature as `0x${string}`,
      })
    } catch (err) {
      console.error('Signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    // Encrypt word and salt
    const wordEncrypted = encrypt(body.word.toLowerCase())
    const saltEncrypted = encrypt(body.salt)
    
    // Save to database
    await saveCommit({
      roundId: body.roundId,
      playerAddress: address,
      wordEncrypted,
      saltEncrypted,
      commitHash: body.commitHash,
    })
    
    return NextResponse.json({
      success: true,
      message: 'Commit saved. Your word will be automatically revealed after seed reveal.',
    })
    
  } catch (error) {
    console.error('Error saving commit:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' })
}
