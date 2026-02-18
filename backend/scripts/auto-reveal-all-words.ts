#!/usr/bin/env tsx
/**
 * Auto-Reveal Script
 * 
 * Runs after seed reveal (00:10 UTC) to automatically reveal all committed words.
 * Batch submits reveals to save gas and ensure all players get revealed.
 */

import { createWalletClient, http, publicActions } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { base } from 'viem/chains'
import { getUnrevealedCommits, markRevealed } from '../lib/db'
import { decrypt } from '../lib/crypto'
import { readFileSync } from 'fs'
import { join } from 'path'

// Contract config
const SPELLBLOCK_ADDRESS = '0xF3cCa88c9F00b5EdD523797f4c04A6c3C20E317e' as const
const RPC_URL = 'https://mainnet.base.org'

// Load ABI
const abiPath = join(__dirname, '../../frontend/src/config/spellblock-abi.json')
const SPELLBLOCK_ABI = JSON.parse(readFileSync(abiPath, 'utf-8'))

interface RevealBatch {
  address: string
  word: string
  salt: string
  merkleProof: string[]
}

async function main() {
  console.log('🔮 SpellBlock Auto-Reveal Starting...')
  console.log(`Time: ${new Date().toISOString()}`)
  
  // Get operator private key
  const privateKey = process.env.PRIVATE_KEY || process.env.SIGNING_KEY
  if (!privateKey) {
    throw new Error('PRIVATE_KEY or SIGNING_KEY not set')
  }
  
  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL),
  }).extend(publicActions)
  
  console.log(`Operator: ${account.address}`)
  
  // Get current round
  const currentRoundId = await client.readContract({
    address: SPELLBLOCK_ADDRESS,
    abi: SPELLBLOCK_ABI,
    functionName: 'currentRoundId',
  }) as bigint
  
  console.log(`Current Round: ${currentRoundId}`)
  
  if (currentRoundId === 0n) {
    console.log('No active round yet')
    return
  }
  
  // Fetch unrevealed commits
  const commits = await getUnrevealedCommits(currentRoundId.toString())
  
  if (commits.length === 0) {
    console.log('✅ No unrevealed commits')
    return
  }
  
  console.log(`Found ${commits.length} unrevealed commits`)
  
  // Decrypt and prepare reveals
  const reveals: RevealBatch[] = []
  
  for (const commit of commits) {
    try {
      const word = decrypt(commit.word_encrypted)
      const salt = decrypt(commit.salt_encrypted)
      
      // Get merkle proof (simplified - in production, fetch from API or generate)
      const merkleProof: string[] = []
      
      reveals.push({
        address: commit.player_address,
        word,
        salt,
        merkleProof,
      })
      
      console.log(`  Decrypted: ${commit.player_address.slice(0, 8)}... → "${word}"`)
    } catch (error) {
      console.error(`  Failed to decrypt for ${commit.player_address}:`, error)
    }
  }
  
  if (reveals.length === 0) {
    console.log('No valid reveals to process')
    return
  }
  
  // Submit reveals (one at a time for now, can batch later)
  let successCount = 0
  let failCount = 0
  
  for (const reveal of reveals) {
    try {
      console.log(`\nRevealing for ${reveal.address.slice(0, 8)}...`)
      
      const hash = await client.writeContract({
        address: SPELLBLOCK_ADDRESS,
        abi: SPELLBLOCK_ABI,
        functionName: 'reveal',
        args: [reveal.word, reveal.salt as `0x${string}`, reveal.merkleProof],
      })
      
      console.log(`  TX: ${hash}`)
      
      // Wait for confirmation
      const receipt = await client.waitForTransactionReceipt({ hash })
      
      if (receipt.status === 'success') {
        await markRevealed(currentRoundId.toString(), reveal.address, hash)
        successCount++
        console.log(`  ✅ Revealed successfully`)
      } else {
        failCount++
        console.log(`  ❌ Transaction failed`)
      }
      
    } catch (error: any) {
      failCount++
      console.error(`  ❌ Failed to reveal:`, error.message || error)
    }
  }
  
  console.log(`\n📊 Summary:`)
  console.log(`  Total: ${reveals.length}`)
  console.log(`  Success: ${successCount}`)
  console.log(`  Failed: ${failCount}`)
  console.log(`\n✅ Auto-reveal complete`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
