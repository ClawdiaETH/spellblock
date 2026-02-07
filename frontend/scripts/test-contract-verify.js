#!/usr/bin/env node

const { exec } = require('child_process')
const { promisify } = require('util')
const { loadWords, createLeaf, generateMerkleData } = require('./setup-dictionary.js')

const execAsync = promisify(exec)
const DICTIONARY_VERIFIER = '0xC7626E8f33e90540664C5717c7aEAe636D5f2Fb4'

async function testContractVerification() {
  console.log('Testing contract verification with merkle proofs...\n')
  
  try {
    // Generate merkle data
    const words = loadWords()
    const { wordProofs } = generateMerkleData(words)
    
    // Test word
    const testWord = 'hello'
    
    if (!wordProofs[testWord]) {
      console.log(`${testWord} not found in dictionary`)
      return
    }
    
    const proof = wordProofs[testWord]
    console.log(`Testing word: ${testWord}`)
    console.log(`Proof length: ${proof.length}`)
    console.log(`Proof: [${proof.join(', ')}]`)
    
    // Format proof for cast command
    const proofStr = proof.map(p => `${p}`).join(' ')
    
    // Call contract verifyWord function
    const cmd = `cast call ${DICTIONARY_VERIFIER} "verifyWord(bytes32[],string)(bool)" "[${proofStr}]" "${testWord}" --rpc-url https://mainnet.base.org`
    
    console.log(`\nCalling contract...`)
    const { stdout } = await execAsync(cmd)
    
    const result = stdout.trim()
    const verified = result === 'true'
    
    console.log(`Result: ${verified ? '✅ VERIFIED' : '❌ FAILED'}`)
    console.log(`Raw output: ${result}`)
    
  } catch (error) {
    console.error('Error testing contract verification:', error.message)
  }
}

testContractVerification()