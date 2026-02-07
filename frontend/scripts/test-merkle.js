#!/usr/bin/env node

const { loadWords, createLeaf, generateMerkleData } = require('./setup-dictionary.js')

async function testMerkleProofs() {
  console.log('Testing merkle proof generation...\n')
  
  try {
    // Load words and generate merkle data
    const words = loadWords()
    const { root, tree, wordProofs } = generateMerkleData(words)
    
    // Test some common words
    const testWords = ['hello', 'world', 'spellblock', 'token', 'ethereum', 'base']
    
    for (const word of testWords) {
      if (wordProofs[word]) {
        const proof = wordProofs[word]
        const leaf = createLeaf(word)
        const rootBuffer = Buffer.from(root.slice(2), 'hex')
        const proofBuffers = proof.map(p => Buffer.from(p.slice(2), 'hex'))
        
        const verified = tree.verify(proofBuffers, leaf, rootBuffer)
        console.log(`${word.padEnd(12)} | ${verified ? '✓' : '✗'} | proof length: ${proof.length}`)
      } else {
        console.log(`${word.padEnd(12)} | not in dictionary`)
      }
    }
    
    console.log(`\nDictionary root: ${root}`)
    console.log(`Total words: ${words.length}`)
    
  } catch (error) {
    console.error('Error testing merkle proofs:', error)
  }
}

testMerkleProofs()