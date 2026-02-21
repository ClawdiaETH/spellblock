'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

const MIN_STAKE = 1_000_000

// Load wagmi-dependent payment form only client-side (avoids WagmiProviderNotFoundError on first render)
const PaymentForm = dynamic(() => import('@/components/PaymentForm'), { ssr: false })

function EnterPageInner() {
  const params = useSearchParams()
  const roundId = params.get('r')
  const word    = params.get('w')?.toUpperCase()
  const handle  = params.get('h')

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

        <div className="text-center">
          <div className="text-4xl mb-2">🔮</div>
          <h1 className="text-2xl font-bold">SpellBlock Round {roundId}</h1>
          <p className="text-gray-400 mt-1">Lock in your entry</p>
        </div>

        <div className="bg-gray-900 rounded-2xl p-6 space-y-4 border border-gray-800">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Your word</span>
            <span className="text-2xl font-bold tracking-widest text-yellow-400">{word}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Handle</span>
            <span className="text-white">@{handle}</span>
          </div>
          <div className="border-t border-gray-800 pt-3 text-xs text-gray-500">
            Spell + valid lengths revealed at commit deadline. Entry scored after reveal.
          </div>
        </div>

        {/* Payment form — loaded client-side only after WagmiProvider is ready */}
        <PaymentForm roundId={roundId} word={word} handle={handle} minStake={MIN_STAKE} />

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
