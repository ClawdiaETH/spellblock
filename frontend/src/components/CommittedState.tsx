'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'

interface CommittedStateProps {
  roundId: bigint
  stake: bigint
}

interface SavedCommit {
  word: string
  salt: string
  stake: string
}

export function CommittedState({ roundId, stake }: CommittedStateProps) {
  const { address } = useAccount()
  const [savedCommit, setSavedCommit] = useState<SavedCommit | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (address && roundId) {
      const saved = localStorage.getItem(`spellblock-commit-${roundId}-${address}`)
      if (saved) {
        setSavedCommit(JSON.parse(saved))
      }
    }
  }, [roundId, address])

  const handleCopy = () => {
    if (savedCommit) {
      const text = `SpellBlock Round ${roundId}\nWord: ${savedCommit.word.toUpperCase()}\nSalt: ${savedCommit.salt}`
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="glass-panel p-6 bg-green-900/20 border border-green-500/30">
      <p className="text-green-400 text-xl font-bold mb-2 text-center">✅ Committed!</p>
      <p className="text-text-secondary text-center mb-4">
        Your stake: {(Number(stake) / 1e18).toLocaleString()} $CLAWDIA
      </p>
      
      {savedCommit ? (
        <div className="bg-background-darker rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-dim text-sm">Your word:</span>
            <button
              onClick={handleCopy}
              className="text-xs px-2 py-1 bg-violet-600 hover:bg-violet-500 rounded transition-colors"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <div className="font-mono text-2xl text-amber-bright tracking-wider text-center mb-2">
            {savedCommit.word.toUpperCase()}
          </div>
          <div className="text-xs text-text-dim text-center break-all">
            Salt: {savedCommit.salt.slice(0, 10)}...{savedCommit.salt.slice(-8)}
          </div>
        </div>
      ) : (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 mb-4">
          <p className="text-red-400 text-sm font-medium">⚠️ Word not found in browser</p>
          <p className="text-red-300 text-xs mt-1">
            Make sure you're using the same browser you committed from.
          </p>
        </div>
      )}
      
      <div className="text-center">
        <p className="text-yellow-400 text-sm font-medium mb-1">
          ⚠️ Don't lose your word!
        </p>
        <p className="text-text-dim text-xs">
          You'll need it to reveal after the commit phase closes.
          {savedCommit && " It's saved in your browser, but copy it somewhere safe just in case."}
        </p>
      </div>
    </div>
  )
}
