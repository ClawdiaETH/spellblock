'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { base } from 'viem/chains'
import { CONTRACTS, ERC20_ABI } from '@/config/contracts'
import { WalletButton } from '@/components/WalletButton'

const COLLECTION_WALLET = '0x615e3faa99dd7de64812128a953215a09509f16a' as const

interface Props {
  roundId: string
  word: string
  handle: string
  minStake: number
}

const STAKE_PRESETS = [1_000_000, 5_000_000, 10_000_000, 25_000_000]

function fmtClawdia(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return n.toLocaleString()
}

function ConfirmedState({ word, roundId, txHash }: { word: string; roundId: string; txHash?: string }) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className="text-6xl">✅</div>
      <div>
        <h2 className="text-2xl font-display font-normal text-text">Entry confirmed!</h2>
        <p className="text-sm text-text-dim mt-2 leading-relaxed">
          <span className="font-mono font-semibold tracking-widest" style={{ color: 'var(--gold)' }}>
            {word}
          </span>{' '}
          is locked in for Round {roundId}.
          <br />
          Results post after the reveal deadline.
        </p>
      </div>
      <div className="bg-surface-2 border border-border rounded-xl px-4 py-3 text-left space-y-1.5">
        <p className="text-xs font-semibold text-text-dim uppercase tracking-wider">Next steps</p>
        <p className="text-sm text-text-dim">
          🔮 Spell + ruler revealed automatically at <span className="font-mono font-semibold text-text">08:00 UTC</span>
        </p>
        <p className="text-sm text-text-dim">
          🏆 Scoring + payouts distributed automatically at <span className="font-mono font-semibold text-text">15:45 UTC</span>
        </p>
        <p className="text-sm text-text-dim">
          📩 Results posted to Twitter + Farcaster
        </p>
      </div>
      {txHash && (
        <div className="bg-surface-2 border border-border rounded-xl px-4 py-3">
          <p className="text-[10.5px] font-semibold text-text-dim uppercase tracking-wider mb-1">Transaction</p>
          <a
            href={`https://basescan.org/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-mono break-all hover:text-accent transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            {txHash.slice(0, 10)}…{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  )
}

export default function PaymentForm({ roundId, word, handle, minStake }: Props) {
  const { address, isConnected, chain } = useAccount()
  const [status, setStatus] = useState<'idle' | 'sending' | 'confirming' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [stake, setStake] = useState(minStake.toString())

  const contracts = CONTRACTS[base.id]
  const { writeContract, data: txHash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  useEffect(() => {
    if (!isSuccess || !txHash || status === 'done') return
    setStatus('confirming')
    fetch('/api/entries/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round_id: Number(roundId),
        word,
        handle,
        wallet: address,
        tx_hash: txHash,
        stake_clawdia: Number(stake),
      }),
    })
      .then(res => {
        if (!res.ok) {
          console.error('[PaymentForm] confirm API returned', res.status)
        }
        setStatus('done')
      })
      .catch(err => {
        console.error('[PaymentForm] confirm API failed:', err)
        // Still show done — tx is confirmed onchain, DB update can be retried manually
        setStatus('done')
      })
  }, [isSuccess, txHash]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePayment() {
    const stakeNum = Number(stake)
    if (!stakeNum || stakeNum < minStake) {
      setErrorMsg(`Minimum stake is ${minStake.toLocaleString()} $CLAWDIA`)
      return
    }
    setStatus('sending')
    setErrorMsg('')
    try {
      writeContract({
        address: contracts.clawdiaToken,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [COLLECTION_WALLET, parseUnits(stakeNum.toString(), 18)],
        chainId: base.id,
      })
    } catch (e: any) {
      setErrorMsg(e.message || 'Transaction failed')
      setStatus('error')
    }
  }

  if (status === 'done') {
    return <ConfirmedState word={word} roundId={roundId} txHash={txHash} />
  }

  if (!isConnected) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center space-y-4">
        <p className="text-sm text-text-dim">Connect your wallet to stake $CLAWDIA and lock in your entry</p>
        <WalletButton />
      </div>
    )
  }

  if (chain?.id !== base.id) {
    return (
      <div className="bg-surface border border-border rounded-2xl p-6 text-center">
        <p className="text-sm font-semibold" style={{ color: 'var(--red)' }}>Switch to Base network</p>
      </div>
    )
  }

  const stakeNum = Number(stake)
  const isProcessing = status === 'sending' || status === 'confirming'

  return (
    <div className="bg-surface border border-border rounded-2xl p-5 space-y-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-text-dim">Your stake</h2>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {STAKE_PRESETS.map(amount => {
          const active = stakeNum === amount
          return (
            <button
              key={amount}
              type="button"
              onClick={() => setStake(String(amount))}
              className="font-mono text-xs font-semibold px-3 py-1.5 rounded border transition-all"
              style={{
                background: active ? 'var(--accent)' : 'var(--surface-2)',
                color: active ? '#fff' : 'var(--text)',
                borderColor: active ? 'var(--accent)' : 'var(--border)',
              }}
            >
              {fmtClawdia(amount)}
            </button>
          )
        })}
      </div>

      {/* Custom amount input */}
      <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-xl px-3 py-2">
        <input
          type="number"
          value={stake}
          onChange={e => setStake(e.target.value)}
          className="flex-1 bg-transparent text-text font-mono text-sm font-semibold focus:outline-none"
          min={minStake}
          step={100_000}
          placeholder={minStake.toString()}
        />
        <span className="text-[10.5px] text-text-dim font-semibold whitespace-nowrap">$CLAWDIA</span>
      </div>

      <p className="text-[11px] text-text-dim">
        min {fmtClawdia(minStake)} · stake more = bigger pot · your share scales with stake
      </p>

      {/* Wallet address */}
      <p className="text-[11px] text-text-dim font-mono">
        from {address?.slice(0, 6)}…{address?.slice(-4)}
      </p>

      {errorMsg && (
        <p className="text-sm" style={{ color: 'var(--red)' }}>{errorMsg}</p>
      )}

      {/* Submit button */}
      <button
        onClick={handlePayment}
        disabled={isProcessing || stakeNum < minStake}
        className="w-full py-4 rounded-xl text-base font-bold transition-all"
        style={{
          background: isProcessing || stakeNum < minStake ? 'var(--border)' : 'var(--accent)',
          color: isProcessing || stakeNum < minStake ? 'var(--text-dim)' : '#fff',
          cursor: isProcessing || stakeNum < minStake ? 'not-allowed' : 'pointer',
        }}
      >
        {status === 'idle'       && `Stake ${fmtClawdia(stakeNum)} $CLAWDIA`}
        {status === 'sending'    && 'Check wallet…'}
        {status === 'confirming' && 'Confirming on chain…'}
        {status === 'error'      && 'Try again'}
      </button>
    </div>
  )
}
