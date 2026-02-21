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

  useEffect(() => {
    if (address && roundId) {
      const saved = localStorage.getItem(`spellblock-commit-${roundId}-${address}`)
      if (saved) {
        setSavedCommit(JSON.parse(saved))
      }
    }
  }, [roundId, address])

  return (
    <div className="glass-panel p-6 bg-green-900/20 border border-green-500/30">
      <p className="text-green-400 text-xl font-bold mb-2 text-center">✅ Committed!</p>
      <p className="text-text-secondary text-center mb-4">
        Your stake: {(Number(stake) / 1e18).toLocaleString()} $CLAWDIA
      </p>

      {savedCommit && (
        <div className="bg-background-darker rounded-lg p-4 mb-4">
          <div className="text-xs text-text-dim text-center mb-1">Your word</div>
          <div className="font-mono text-2xl text-amber-bright tracking-wider text-center">
            {savedCommit.word.toUpperCase()}
          </div>
        </div>
      )}

      <div className="bg-violet-900/30 border border-violet-500/30 rounded-lg p-4 text-center">
        <p className="text-violet-300 text-sm font-medium mb-1">
          ✨ Auto-reveal enabled
        </p>
        <p className="text-text-dim text-xs leading-relaxed">
          Your word is saved. We&apos;ll reveal it automatically when the seed drops —
          no action needed from you.
        </p>
      </div>
    </div>
  )
}
