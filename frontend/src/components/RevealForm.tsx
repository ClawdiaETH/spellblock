'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { base } from 'viem/chains'
import { CONTRACTS, SPELLBLOCK_ABI } from '@/config/contracts'
import { getMerkleProof } from '@/utils/merkle'

interface RevealFormProps {
  roundId: bigint
  spellId: number
  spellParam: `0x${string}`
  validLengths: number[]
  onRevealSuccess?: () => void
}

export function RevealForm({ roundId, spellId, spellParam, validLengths, onRevealSuccess }: RevealFormProps) {
  const [word, setWord] = useState('')
  const [salt, setSalt] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [passesSpell, setPassesSpell] = useState<boolean | null>(null)
  const [passesRuler, setPassesRuler] = useState<boolean | null>(null)
  
  const { address } = useAccount()
  const chainId = base.id
  const contracts = CONTRACTS[chainId]

  const { writeContract: reveal, data: revealHash, isPending: isRevealing } = useWriteContract()
  const { isSuccess: revealSuccess } = useWaitForTransactionReceipt({ hash: revealHash })

  // Load commitment from localStorage
  useEffect(() => {
    if (!address) return
    
    const saved = localStorage.getItem(`spellblock-commit-${roundId}-${address}`)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        setWord(data.word || '')
        setSalt(data.salt || '')
      } catch (e) {
        console.error('Failed to load commitment:', e)
      }
    }
  }, [address, roundId])

  useEffect(() => {
    if (revealSuccess) {
      onRevealSuccess?.()
    }
  }, [revealSuccess, onRevealSuccess])

  const checkConstraints = () => {
    const w = word.toUpperCase()
    const letter = spellParam ? String.fromCharCode(parseInt(spellParam.slice(2, 4), 16) || 65) : ''
    
    // Check spell
    let spell = false
    switch (spellId) {
      case 0: // Veto
        spell = !w.includes(letter)
        break
      case 1: // Anchor
        spell = w.startsWith(letter)
        break
      case 2: // Seal
        spell = w.endsWith(letter)
        break
      case 3: // Gem
        spell = /(.)\1/.test(w)
        break
    }
    
    // Check ruler against contract-provided valid lengths
    const ruler = validLengths.includes(w.length)
    
    setPassesSpell(spell)
    setPassesRuler(ruler)
    setRevealed(true)
  }

  const handleReveal = async () => {
    if (!word || !salt) {
      alert('Missing word or salt. Did you commit in this round?')
      return
    }

    try {
      // Get merkle proof
      const merkleProof = await getMerkleProof(word)
      
      reveal({
        address: contracts.spellBlockGame,
        abi: SPELLBLOCK_ABI,
        functionName: 'reveal',
        args: [word.toLowerCase(), salt as `0x${string}`, (merkleProof || []) as readonly `0x${string}`[]],
      })
    } catch (error) {
      console.error('Failed to reveal:', error)
      alert('Failed to generate proof. Please try again.')
    }
  }

  const isWinner = passesSpell && passesRuler
  const isConsolation = passesSpell && !passesRuler
  const isBurned = !passesSpell

  if (!word) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 text-center">
        <p className="text-text-dim text-sm">No commitment found for this round</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Your committed word */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[19px] font-display tracking-tight">Your committed word</h2>
        </div>

        {!revealed ? (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex gap-1.5 justify-center flex-wrap mb-2">
              {word.split('').map((_, i) => (
                <span key={i} className="hidden-char">?</span>
              ))}
            </div>
            <div className="text-xs text-text-dim text-center">
              {word.length} letters · Reveal to check constraints
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="flex gap-1.5 justify-center flex-wrap">
              {word.toUpperCase().split('').map((ch, i) => (
                <span
                  key={i}
                  className={`revealed-char ${isWinner ? 'winner' : isConsolation ? 'consolation' : 'burned'} animate-revealChar`}
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action */}
      {!revealed ? (
        <button
          onClick={checkConstraints}
          disabled={isRevealing}
          className="btn-reveal"
        >
          <span>{isRevealing ? 'Revealing...' : 'Reveal my word'}</span>
          <span className="text-[11.5px] font-normal opacity-70">
            Show word & check against spell + ruler
          </span>
        </button>
      ) : (
        <div
          className="flex gap-3.5 items-center p-4 rounded-xl border animate-fadeInUp"
          style={{
            background: isWinner 
              ? 'linear-gradient(135deg, #16A34A10, #16A34A20)' 
              : isConsolation 
              ? 'linear-gradient(135deg, #D9770610, #D9770620)'
              : 'linear-gradient(135deg, #DC262610, #DC262620)',
            borderColor: isWinner ? '#16A34A40' : isConsolation ? '#D9770640' : '#DC262640',
          }}
        >
          <div className="text-4xl">{isWinner ? '🏆' : isConsolation ? '🛡️' : '🔥'}</div>
          <div>
            <div className="font-bold text-lg mb-1" style={{ color: isWinner ? '#16A34A' : isConsolation ? '#D97706' : '#DC2626' }}>
              {isWinner ? 'Winner!' : isConsolation ? 'Consolation' : 'Burned'}
            </div>
            <div className="text-xs text-text-dim leading-relaxed">
              {isWinner
                ? 'Your word survived both constraints. Winnings distribute at 15:45 UTC / 10:45 AM ET.'
                : isConsolation
                ? 'Passed spell but failed ruler. You recover your stake (no profit, no loss).'
                : 'Your word failed the spell. Your stake has been permanently burned.'}
            </div>
          </div>
        </div>
      )}

      {revealed && (
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2 p-2 bg-surface-2 rounded">
            <span className={passesSpell ? 'text-green' : 'text-red'}>
              {passesSpell ? '✓' : '✗'}
            </span>
            <span>Spell check: {passesSpell ? 'PASSES' : 'FAILS'}</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-surface-2 rounded">
            <span className={passesRuler ? 'text-green' : 'text-red'}>
              {passesRuler ? '✓' : '✗'}
            </span>
            <span>Ruler check: {passesRuler ? 'PASSES' : `FAILS (yours: ${word.length})`}</span>
          </div>
        </div>
      )}

      {revealed && (
        <button
          onClick={handleReveal}
          disabled={isRevealing}
          className="w-full py-3 px-4 bg-purple hover:bg-purple/90 disabled:opacity-50 text-white font-semibold rounded-xl transition-all"
        >
          {isRevealing ? 'Submitting...' : 'Submit reveal onchain'}
        </button>
      )}
    </div>
  )
}
