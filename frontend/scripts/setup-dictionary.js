#!/usr/bin/env node

const { MerkleTree } = require('merkletreejs')
const { keccak256 } = require('js-sha3')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

// Contract addresses
const DICTIONARY_VERIFIER = '0xC7626E8f33e90540664C5717c7aEAe636D5f2Fb4'
const SIGNING_KEY_PATH = `${process.env.HOME}/.clawdbot/secrets/signing_key`

// Load dictionary words
function loadWords() {
  const wordsPath = path.join(__dirname, '../public/dictionary/words.txt')
  const wordsText = fs.readFileSync(wordsPath, 'utf8')
  return wordsText.trim().split('\n').map(word => word.toLowerCase().trim())
}

// Create leaf from word (matching contract's _normalize + keccak256(abi.encodePacked))
function createLeaf(word) {
  // Contract does: keccak256(abi.encodePacked(_normalize(word)))
  // _normalize just converts to lowercase, which we already have
  const wordBytes = Buffer.from(word, 'utf8')
  return Buffer.from(keccak256.arrayBuffer(wordBytes))
}

// Generate merkle tree and proofs
function generateMerkleData(words) {
  console.log(`Generating merkle tree for ${words.length} words...`)
  
  // Create leaves
  const leaves = words.map(createLeaf)
  
  // Create merkle tree
  const tree = new MerkleTree(leaves, (data) => Buffer.from(keccak256.arrayBuffer(data)), { sortPairs: true })
  const root = tree.getRoot()
  
  console.log(`Merkle root: 0x${root.toString('hex')}`)
  
  // Create lookup map for proofs
  const wordProofs = {}
  words.forEach(word => {
    const leaf = createLeaf(word)
    const proof = tree.getHexProof(leaf)
    wordProofs[word] = proof
  })
  
  return {
    root: `0x${root.toString('hex')}`,
    tree,
    wordProofs
  }
}

// Set dictionary root in contract
async function setDictionaryRoot(root) {
  console.log(`Setting dictionary root to: ${root}`)
  
  // Read signing key
  const signingKey = fs.readFileSync(SIGNING_KEY_PATH, 'utf8').trim()
  
  // Execute transaction
  const cmd = `cast send ${DICTIONARY_VERIFIER} "setDictionaryRoot(bytes32)" ${root} --private-key ${signingKey} --rpc-url https://mainnet.base.org`
  
  try {
    const { stdout, stderr } = await execAsync(cmd)
    console.log('Transaction sent:', stdout.trim())
    return true
  } catch (error) {
    console.error('Failed to set dictionary root:', error.message)
    return false
  }
}

// Save merkle data for frontend use
function saveMerkleData(wordProofs, root) {
  const dataPath = path.join(__dirname, '../src/data/merkle-proofs.json')
  const merkleData = {
    root,
    generated: new Date().toISOString(),
    totalWords: Object.keys(wordProofs).length,
    proofs: wordProofs
  }
  
  // Create directory if it doesn't exist
  const dataDir = path.dirname(dataPath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
  
  fs.writeFileSync(dataPath, JSON.stringify(merkleData, null, 2))
  console.log(`Saved merkle proofs to: ${dataPath}`)
}

// Test a few words
function testProofs(tree, wordProofs, root) {
  console.log('\nTesting proofs...')
  
  const testWords = ['hello', 'world', 'spellblock', 'merkle']
  
  testWords.forEach(word => {
    if (wordProofs[word]) {
      const leaf = createLeaf(word)
      const proof = wordProofs[word].map(p => Buffer.from(p.slice(2), 'hex'))
      const verified = tree.verify(proof, leaf, Buffer.from(root.slice(2), 'hex'))
      console.log(`${word}: ${verified ? '✓' : '✗'} (proof length: ${proof.length})`)
    } else {
      console.log(`${word}: not in dictionary`)
    }
  })
}

// Main function
async function main() {
  try {
    // Load words
    const words = loadWords()
    
    // Generate merkle tree and proofs
    const { root, tree, wordProofs } = generateMerkleData(words)
    
    // Test proofs locally
    testProofs(tree, wordProofs, root)
    
    // Set dictionary root in contract
    const success = await setDictionaryRoot(root)
    
    if (success) {
      // Save merkle data for frontend
      saveMerkleData(wordProofs, root)
      console.log('\n✅ Dictionary setup complete!')
      console.log('Frontend can now generate valid merkle proofs.')
    } else {
      console.log('\n❌ Failed to set dictionary root in contract')
      process.exit(1)
    }
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { loadWords, createLeaf, generateMerkleData }