'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi'
import { parseUnits, formatUnits, keccak256, encodePacked, toHex } from 'viem'
import { base } from 'viem/chains'
import { CONTRACTS, SPELLBLOCK_ABI, ERC20_ABI } from '@/config/contracts'
import { useDictionary } from '@/hooks/useDictionary'
import { getMerkleProof } from '@/utils/merkle'

interface CommitFormProps {
  roundId: bigint
  letterPool: string
  minStake: bigint
  onCommitSuccess?: () => void
}

export function CommitForm({ roundId, letterPool, minStake, onCommitSuccess }: CommitFormProps) {
  const [word, setWord] = useState('')
  const [stake, setStake] = useState('1000000')
  const [salt, setSalt] = useState('')
  const [error, setError] = useState('')
  const [step, setStep] = useState<'approve' | 'commit'>('approve')
  
  const { address, isConnected } = useAccount()
  const chainId = base.id
  const contracts = CONTRACTS[chainId]
  const { validateWord: validateDictionaryWord, isLoading: isDictionaryLoading } = useDictionary()

  useEffect(() => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32))
    setSalt(toHex(randomBytes))
  }, [])

  const { data: allowance } = useReadContract({
    address: contracts.clawdiaToken,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, contracts.spellBlockGame] : undefined,
  })

  const { data: balance } = useReadContract({
    address: contracts.clawdiaToken,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  })

  const { writeContract: approve, data: approveHash, isPending: isApproving } = useWriteContract()
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash })

  const { writeContract: commit, data: commitHash, isPending: isCommitting } = useWriteContract()
  const { isSuccess: commitSuccess } = useWaitForTransactionReceipt({ hash: commitHash })
  const { signMessageAsync } = useSignMessage()

  useEffect(() => {
    if (allowance && stake) {
      const stakeAmount = parseUnits(stake || '0', 18)
      if (allowance >= stakeAmount) {
        setStep('commit')
      } else {
        setStep('approve')
      }
    }
  }, [allowance, stake])

  useEffect(() => {
    if (approveSuccess) {
      setStep('commit')
    }
  }, [approveSuccess])

  useEffect(() => {
    if (commitSuccess && address) {
      const saveCommitData = async () => {
        try {
          // Calculate commitHash for signing
          const commitHashValue = keccak256(
            encodePacked(
              ['uint256', 'address', 'string', 'bytes32'],
              [roundId, address, word.toLowerCase(), salt as `0x${string}`]
            )
          )

          // Sign commitHash
          const signature = await signMessageAsync({ message: commitHashValue })

          // Save to backend
          try {
            await fetch('/api/commit/save', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                roundId: roundId.toString(),
                address,
                word: word.toLowerCase(),
                salt,
                commitHash: commitHashValue,
                signature,
              }),
            })
            console.log('✅ Commit saved to backend for auto-reveal')
          } catch (apiError) {
            console.error('❌ Failed to save commit to backend:', apiError)
            // Continue anyway - player can still manually reveal
          }

          // Save to localStorage (for manual reveal fallback)
          const merkleProof = await getMerkleProof(word)
          const commitData = {
            roundId: roundId.toString(),
            word,
            salt,
            stake,
            merkleProof,
          }
          localStorage.setItem(`spellblock-commit-${roundId}-${address}`, JSON.stringify(commitData))
          onCommitSuccess?.()
        } catch (error) {
          console.error('Failed to generate merkle proof:', error)
          const commitData = {
            roundId: roundId.toString(),
            word,
            salt,
            stake,
            merkleProof: null,
          }
          localStorage.setItem(`spellblock-commit-${roundId}-${address}`, JSON.stringify(commitData))
          onCommitSuccess?.()
        }
      }
      saveCommitData()
    }
  }, [commitSuccess, roundId, word, salt, stake, address, onCommitSuccess, signMessageAsync])

  // Removed letter usage tracking - letters can be clicked unlimited times

  const addLetter = (letter: string, idx: number) => {
    // Allow any letter to be clicked multiple times
    setWord((w) => w + letter)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!word || word.length < 3) {
      setError('Word must be at least 3 letters')
      return
    }

    const wordError = validateDictionaryWord(word, letterPool)
    if (wordError) {
      setError(wordError)
      return
    }

    const stakeAmount = parseUnits(stake || '0', 18)
    if (stakeAmount < minStake) {
      setError(`Minimum stake is ${formatUnits(minStake, 18)} $CLAWDIA`)
      return
    }

    if (balance && stakeAmount > balance) {
      setError('Insufficient balance')
      return
    }

    if (step === 'approve') {
      approve({
        address: contracts.clawdiaToken,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [contracts.spellBlockGame, stakeAmount],
      })
    } else {
      const commitHash = keccak256(
        encodePacked(
          ['uint256', 'address', 'string', 'bytes32'],
          [roundId, address!, word.toLowerCase(), salt as `0x${string}`]
        )
      )

      commit({
        address: contracts.spellBlockGame,
        abi: SPELLBLOCK_ABI,
        functionName: 'commit',
        args: [commitHash, stakeAmount],
      })
    }
  }

  if (!isConnected) {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 text-center">
        <p className="text-text-dim">Connect your wallet to play</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Letter Pool (interactive) */}
      <div>
        <div className="flex items-baseline justify-between mb-2 mt-4">
          <h2 className="text-[23px] font-display tracking-tight">Letter pool</h2>
          <span className="text-[11px] font-mono text-text-dim">{letterPool.length} available</span>
        </div>
        <div className="bg-surface border border-border rounded-xl p-3.5 flex flex-wrap gap-1.5">
          {letterPool.split('').map((letter, i) => (
            <button
              key={i}
              type="button"
              onClick={() => addLetter(letter, i)}
              className="letter-tile transition-all hover:scale-105"
            >
              {letter}
            </button>
          ))}
        </div>
      </div>

      {/* Word Builder */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[23px] font-display tracking-tight">Your word</h2>
          {word.length > 0 && <span className="text-[11.5px] font-mono text-accent font-medium">{word.length} letters</span>}
        </div>
        
        <div className="bg-surface border border-border rounded-xl p-3.5">
          {/* Word display */}
          <div className="min-h-[52px] flex items-center justify-center gap-1.5 flex-wrap py-1.5 pb-2.5">
            {word.length === 0 ? (
              <span className="text-sm text-text-dim italic opacity-40">Tap letters or type below...</span>
            ) : (
              word.toUpperCase().split('').map((ch, i) => (
                <span key={i} className="word-char animate-charPop">
                  {ch}
                </span>
              ))
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-1.5 justify-center mb-1.5">
            <button
              type="button"
              onClick={() => setWord((w) => w.slice(0, -1))}
              disabled={!word.length}
              className="text-[11.5px] font-medium px-3 py-1 bg-surface-2 border border-border text-text-dim rounded hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => setWord('')}
              disabled={!word.length}
              className="text-[11.5px] font-medium px-3 py-1 bg-surface-2 border border-border text-text-dim rounded hover:text-text disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>

          {/* Text input */}
          <input
            type="text"
            value={word}
            onChange={(e) => setWord(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
            placeholder="Or type directly..."
            className="w-full py-2 px-3 bg-surface-2 border border-border rounded text-sm font-mono uppercase tracking-widest text-text placeholder:text-text-dim placeholder:opacity-50 focus:outline-none focus:border-accent"
            maxLength={15}
          />
        </div>
      </div>

      {/* Stake Selection */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-[23px] font-display tracking-tight">Stake</h2>
        </div>
        
        <div className="flex flex-wrap gap-1.5 mb-2">
          {[1000000, 5000000, 10000000, 25000000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setStake(String(amount))}
              className="font-mono text-xs font-semibold px-3 py-1.5 rounded border transition-all"
              style={{
                background: Number(stake) === amount ? 'var(--accent)' : 'var(--surface)',
                color: Number(stake) === amount ? '#fff' : 'var(--text)',
                borderColor: Number(stake) === amount ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {amount >= 1000000 ? `${(amount / 1000000)}M` : amount}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-surface border border-border rounded px-3">
          <input
            type="number"
            value={stake}
            onChange={(e) => setStake(e.target.value)}
            className="flex-1 py-2 bg-transparent border-none text-text font-mono text-base font-semibold focus:outline-none"
            min={1000000}
            step={1}
          />
          <span className="text-[10.5px] text-text-dim font-semibold whitespace-nowrap">$CLAWDIA</span>
        </div>

        {balance !== undefined && (
          <p className="text-xs text-text-dim mt-1">
            Balance: {parseFloat(formatUnits(balance, 18)).toLocaleString()} $CLAWDIA
          </p>
        )}
      </div>

      {error && (
        <p className="text-red text-sm">{error}</p>
      )}

      {/* Commit Button */}
      <button
        type="submit"
        disabled={isApproving || isCommitting || isDictionaryLoading || word.length < 3}
        className="btn-commit"
        style={{
          opacity: word.length < 3 || isApproving || isCommitting || isDictionaryLoading ? 0.4 : 1,
          cursor: word.length < 3 || isApproving || isCommitting || isDictionaryLoading ? 'not-allowed' : 'pointer'
        }}
      >
        <span>
          {isDictionaryLoading ? 'Loading...' : isApproving || isCommitting ? 'Processing...' : step === 'approve' ? 'Approve $CLAWDIA' : 'Commit word'}
        </span>
        <span className="text-[11.5px] font-normal opacity-70">
          Stake {Number(stake) >= 1000000 ? `${(Number(stake) / 1000000)}M` : stake} $CLAWDIA · Word hidden until reveal
        </span>
      </button>
    </form>
  )
}
