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
      .then(() => setStatus('done'))
      .catch(() => setStatus('done'))
  }, [isSuccess, txHash]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handlePayment() {
    const stakeNum = Number(stake)
    if (!stakeNum || stakeNum < minStake) {
      setErrorMsg(`Minimum stake is ${minStake.toLocaleString()} CLAWDIA`)
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
    return (
      <div className="text-center space-y-3">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-green-400">Entry confirmed!</h2>
        <p className="text-gray-400 text-sm">
          <strong>{word}</strong> is locked in for Round {roundId}.
          Results post after the reveal deadline.
        </p>
      </div>
    )
  }

  if (!isConnected) {
    return (
      <div className="text-center space-y-4">
        <p className="text-gray-400 text-sm">Connect your wallet to pay with $CLAWDIA</p>
        <WalletButton />
      </div>
    )
  }

  if (chain?.id !== base.id) {
    return <p className="text-center text-red-400 text-sm">Switch to Base network</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-gray-400 text-sm">Stake amount</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={stake}
            min={minStake}
            step={100_000}
            onChange={e => setStake(e.target.value)}
            className="bg-gray-800 text-white text-right rounded-lg px-3 py-1 w-40
                       border border-gray-700 focus:border-yellow-500 focus:outline-none text-sm"
          />
          <span className="text-gray-400 text-sm">$CLAWDIA</span>
        </div>
      </div>
      <p className="text-xs text-gray-600 text-right">min {minStake.toLocaleString()} · stake more = bigger pot</p>
      <p className="text-gray-400 text-xs text-center">
        From {address?.slice(0, 6)}…{address?.slice(-4)}
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
        {status === 'error'      && 'Try again'}
      </button>
      {errorMsg && <p className="text-red-400 text-sm text-center">{errorMsg}</p>}
    </div>
  )
}
