'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { base } from 'viem/chains'
import { CONTRACTS, ERC20_ABI } from '@/config/contracts'
import { WalletButton } from '@/components/WalletButton'

// Bot collection wallet — all entry payments go here
const COLLECTION_WALLET = '0x615e3faa99dd7de64812128a953215a09509f16a' as const
const MIN_STAKE = 1_000_000  // 1M CLAWDIA minimum

function EnterPageInner() {
  const params = useSearchParams()
  const roundId = params.get('r')
  const word    = params.get('w')?.toUpperCase()
  const handle  = params.get('h')

  const { address, isConnected, chain } = useAccount()
  const [status, setStatus] = useState<'idle' | 'sending' | 'confirming' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [stake, setStake] = useState(MIN_STAKE.toString())

  const contracts = CONTRACTS[base.id]

  const { writeContract, data: txHash } = useWriteContract()
  const { isSuccess } = useWaitForTransactionReceipt({ hash: txHash })

  async function handlePayment() {
    if (!address || !roundId || !word || !handle) return
    const stakeNum = Number(stake)
    if (!stakeNum || stakeNum < MIN_STAKE) {
      setErrorMsg(`Minimum stake is ${MIN_STAKE.toLocaleString()} CLAWDIA`)
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

  // When tx lands, confirm with backend
  useEffect(() => {
    if (!isSuccess || !txHash || status === 'done') return
    setStatus('confirming')
    fetch('/api/entries/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ round_id: Number(roundId), word, handle, wallet: address, tx_hash: txHash, stake_clawdia: Number(stake) }),
    })
      .then(() => setStatus('done'))
      .catch(() => setStatus('done')) // tx landed regardless
  }, [isSuccess, txHash]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!roundId || !word || !handle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <p className="text-gray-400">Invalid entry link.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">

        {/* Header */}
        <div className="text-center">
          <div className="text-4xl mb-2">🔮</div>
          <h1 className="text-2xl font-bold">SpellBlock Round {roundId}</h1>
          <p className="text-gray-400 mt-1">Lock in your entry</p>
        </div>

        {/* Entry card */}
        <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Your word</span>
            <span className="text-2xl font-bold tracking-widest text-yellow-400">{word}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Handle</span>
            <span className="text-white">@{handle}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Stake</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={stake}
                min={MIN_STAKE}
                step={100_000}
                onChange={e => setStake(e.target.value)}
                className="bg-gray-800 text-white text-right rounded-lg px-3 py-1 w-40
                           border border-gray-700 focus:border-yellow-500 focus:outline-none text-sm"
              />
              <span className="text-gray-400 text-sm">$CLAWDIA</span>
            </div>
          </div>
          <p className="text-xs text-gray-600">min 1,000,000 · stake more = bigger pot</p>
          <div className="border-t border-gray-800 pt-3 text-xs text-gray-500">
            Spell + valid lengths revealed at commit deadline. Entry is scored after reveal.
          </div>
        </div>

        {/* Wallet + pay */}
        {status === 'done' ? (
          <div className="text-center space-y-3">
            <div className="text-5xl">✅</div>
            <h2 className="text-xl font-bold text-green-400">Entry confirmed!</h2>
            <p className="text-gray-400 text-sm">
              <strong>{word}</strong> is locked in for Round {roundId}.
              Results post after the reveal deadline.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {!isConnected ? (
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-4">Connect your wallet to pay with $CLAWDIA</p>
                <WalletButton />
              </div>
            ) : chain?.id !== base.id ? (
              <p className="text-center text-red-400 text-sm">Switch to Base network</p>
            ) : (
              <>
                <p className="text-gray-400 text-xs text-center">
                  Sending from {address?.slice(0, 6)}…{address?.slice(-4)}
                </p>
                <button
                  onClick={handlePayment}
                  disabled={status === 'sending' || status === 'confirming'}
                  className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50
                             text-black font-bold py-4 rounded-xl text-lg transition-all"
                >
                  {status === 'idle'       && `Stake ${Number(stake).toLocaleString()} $CLAWDIA`}
                  {status === 'sending'    && 'Check wallet…'}
                  {status === 'confirming' && 'Confirming…'}
                </button>
                {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function EnterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black" />}>
      <EnterPageInner />
    </Suspense>
  )
}
