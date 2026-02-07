import { useState, useEffect, useCallback } from 'react'

interface DictionaryService {
  isValidWord: (word: string) => boolean
  isBlockedWord: (word: string) => boolean
  isLoading: boolean
  error: string | null
  validateWord: (word: string, letterPool: string) => string | null
}

let dictionaryCache: Set<string> | null = null
let blocklistCache: Set<string> | null = null
let loadingPromise: Promise<void> | null = null

export function useDictionary(): DictionaryService {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadDictionary = useCallback(async () => {
    if (dictionaryCache && blocklistCache) {
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
        // Load words and blocklist in parallel
        const [wordsResponse, blocklistResponse] = await Promise.all([
          fetch('/dictionary/words.txt'),
          fetch('/dictionary/blocklist.json')
        ])

        if (!wordsResponse.ok) {
          throw new Error(`Failed to load dictionary: ${wordsResponse.status}`)
        }
        if (!blocklistResponse.ok) {
          throw new Error(`Failed to load blocklist: ${blocklistResponse.status}`)
        }

        const [wordsText, blocklistJson] = await Promise.all([
          wordsResponse.text(),
          blocklistResponse.json()
        ])

        // Parse words.txt into a Set for O(1) lookups
        const words = wordsText
          .trim()
          .split('\n')
          .map(word => word.toLowerCase().trim())
          .filter(word => word.length > 0)

        dictionaryCache = new Set(words)
        blocklistCache = new Set(blocklistJson.map((word: string) => word.toLowerCase()))

        console.log(`Dictionary loaded: ${dictionaryCache.size} words, ${blocklistCache.size} blocked`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load dictionary'
        setError(errorMessage)
        console.error('Dictionary loading error:', err)
        throw err
      } finally {
        setIsLoading(false)
        loadingPromise = null
      }
    })()

    await loadingPromise
  }, [])

  // Load dictionary on first use
  useEffect(() => {
    if (!dictionaryCache || !blocklistCache) {
      loadDictionary()
    }
  }, [loadDictionary])

  const isValidWord = useCallback((word: string): boolean => {
    if (!dictionaryCache) return false
    return dictionaryCache.has(word.toLowerCase())
  }, [])

  const isBlockedWord = useCallback((word: string): boolean => {
    if (!blocklistCache) return false
    return blocklistCache.has(word.toLowerCase())
  }, [])

  const validateWord = useCallback((word: string, letterPool: string): string | null => {
    const wordLower = word.toLowerCase()
    
    // 1. Length check (4-12 letters based on metadata.json)
    if (wordLower.length < 4) {
      return 'Word must be at least 4 letters'
    }
    if (wordLower.length > 12) {
      return 'Word must be at most 12 letters'
    }

    // 2. Letter pool check (all letters must be in today's pool)
    const availableLetters = new Set(letterPool.toLowerCase().split(''))
    for (const letter of wordLower) {
      if (!availableLetters.has(letter)) {
        return `Letter '${letter.toUpperCase()}' is not in today's pool`
      }
    }

    // 3. Dictionary check (word must exist in words.txt)
    if (!isValidWord(wordLower)) {
      return 'Word not found in dictionary'
    }

    // 4. Blocklist check (word must not be in blocklist)
    if (isBlockedWord(wordLower)) {
      return 'Word is not allowed'
    }

    return null // Valid word
  }, [isValidWord, isBlockedWord])

  return {
    isValidWord,
    isBlockedWord,
    isLoading,
    error,
    validateWord
  }
}