import { MerkleTree } from 'merkletreejs'
import { keccak256 } from 'js-sha3'

// Dictionary words cache
let dictionaryWords: string[] | null = null
let merkleTree: MerkleTree | null = null
let loadPromise: Promise<void> | null = null

// Known dictionary root (will be set after deployment)
export const DICTIONARY_ROOT = '0xeb9254f78e4633b4c3ecaccd1362d6af29578d0cdf860a4dbdbe39d5e3ab02c9'

// Create leaf from word (matching contract's _normalize + keccak256(abi.encodePacked))
function createLeaf(word: string): Buffer {
  // Contract does: keccak256(abi.encodePacked(_normalize(word)))
  // _normalize just converts to lowercase, which we already have
  const wordBytes = Buffer.from(word.toLowerCase(), 'utf8')
  return Buffer.from(keccak256.arrayBuffer(wordBytes))
}

// Load dictionary and create merkle tree
async function loadDictionary(): Promise<void> {
  if (dictionaryWords && merkleTree) return

  if (loadPromise) {
    await loadPromise
    return
  }

  loadPromise = (async () => {
    try {
      // Load dictionary words
      const response = await fetch('/dictionary/words.txt')
      if (!response.ok) {
        throw new Error(`Failed to load dictionary: ${response.status}`)
      }
      
      const wordsText = await response.text()
      dictionaryWords = wordsText.trim().split('\n').map(word => word.toLowerCase().trim())
      
      // Create merkle tree
      const leaves = dictionaryWords.map(createLeaf)
      merkleTree = new MerkleTree(leaves, (data: Buffer) => Buffer.from(keccak256.arrayBuffer(data)), { 
        sortPairs: true 
      })

      console.log(`Dictionary loaded: ${dictionaryWords.length} words`)
      console.log(`Merkle root: 0x${merkleTree.getRoot().toString('hex')}`)
    } catch (error) {
      console.error('Failed to load dictionary:', error)
      throw error
    }
  })()

  await loadPromise
}

// Generate merkle proof for a word
export async function getMerkleProof(word: string): Promise<string[] | null> {
  try {
    await loadDictionary()
    
    if (!dictionaryWords || !merkleTree) {
      throw new Error('Dictionary not loaded')
    }

    const normalizedWord = word.toLowerCase()
    
    // Check if word exists in dictionary
    if (!dictionaryWords.includes(normalizedWord)) {
      return null // Word not in dictionary
    }

    // Generate proof
    const leaf = createLeaf(normalizedWord)
    const proof = merkleTree.getHexProof(leaf)
    
    return proof
  } catch (error) {
    console.error('Failed to generate merkle proof:', error)
    return null
  }
}

// Verify a proof locally (for testing)
export async function verifyProof(word: string, proof: string[]): Promise<boolean> {
  try {
    await loadDictionary()
    
    if (!merkleTree) {
      throw new Error('Dictionary not loaded')
    }

    const leaf = createLeaf(word.toLowerCase())
    const root = merkleTree.getRoot()
    const proofBuffers = proof.map(p => Buffer.from(p.slice(2), 'hex'))
    
    return merkleTree.verify(proofBuffers, leaf, root)
  } catch (error) {
    console.error('Failed to verify proof:', error)
    return false
  }
}

// Get dictionary root
export function getDictionaryRoot(): string {
  return DICTIONARY_ROOT
}