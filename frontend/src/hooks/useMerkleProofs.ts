import { useState, useEffect, useCallback } from 'react'

interface MerkleProofService {
  getProof: (word: string) => string[] | null
  getDictionaryRoot: () => string | null
  isLoading: boolean
  error: string | null
}

interface MerkleData {
  root: string
  generated: string
  totalWords: number
  proofs: { [word: string]: string[] }
}

let merkleCache: MerkleData | null = null
let loadingPromise: Promise<void> | null = null

export function useMerkleProofs(): MerkleProofService {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadMerkleData = useCallback(async () => {
    if (merkleCache) {
      return // Already loaded
    }

    if (loadingPromise) {
      await loadingPromise // Wait for ongoing load
      return
    }

    setIsLoading(true)
    setError(null)

    loadingPromise = (async () => {
      try {
        const response = await fetch('/src/data/merkle-proofs.json')
        
        if (!response.ok) {
          throw new Error(`Failed to load merkle proofs: ${response.status}`)
        }

        const data = await response.json()
        merkleCache = data

        console.log(`Merkle proofs loaded: ${data.totalWords} words, root: ${data.root}`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load merkle proofs'
        setError(errorMessage)
        console.error('Merkle proof loading error:', err)
        throw err
      } finally {
        setIsLoading(false)
        loadingPromise = null
      }
    })()

    await loadingPromise
  }, [])

  // Load merkle data on first use
  useEffect(() => {
    if (!merkleCache) {
      loadMerkleData()
    }
  }, [loadMerkleData])

  const getProof = useCallback((word: string): string[] | null => {
    if (!merkleCache) return null
    const normalizedWord = word.toLowerCase()
    return merkleCache.proofs[normalizedWord] || null
  }, [])

  const getDictionaryRoot = useCallback((): string | null => {
    return merkleCache?.root || null
  }, [])

  return {
    getProof,
    getDictionaryRoot,
    isLoading,
    error
  }
}