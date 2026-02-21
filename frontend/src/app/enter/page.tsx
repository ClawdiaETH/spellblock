'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { ThemeToggle } from '@/components/ThemeToggle'

// Load wagmi-dependent form client-side only
const PaymentForm = dynamic(() => import('@/components/PaymentForm'), { ssr: false })

const MIN_STAKE = 1_000_000

const SPELLS = [
  { icon: '🚫', name: 'Veto', desc: 'Must NOT contain a specific letter' },
  { icon: '⚓', name: 'Anchor', desc: 'Must START with a specific letter' },
  { icon: '🔒', name: 'Seal', desc: 'Must END with a specific letter' },
  { icon: '💎', name: 'Gem', desc: 'Must contain double letters (e.g. LL, OO)' },
]

interface RoundStats {
  count: number
  pot: number
}

function useRoundStats(roundId: string | null) {
  const [stats, setStats] = useState<RoundStats | null>(null)
  useEffect(() => {
    if (!roundId) return
    fetch(`/api/entries/stats?r=${roundId}`)
      .then(r => r.json())
      .then(d => setStats(d))
      .catch(() => {})
  }, [roundId])
  return stats
}

function StatsPill({ count, pot }: { count: number; pot: number }) {
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-mono">
      <span className="flex items-center gap-1.5">
        <span className="text-text-dim">entries</span>
        <span className="font-semibold text-text">{count}</span>
      </span>
      <span className="text-border">·</span>
      <span className="flex items-center gap-1.5">
        <span className="text-text-dim">pot</span>
        <span className="font-semibold" style={{ color: 'var(--gold)' }}>
          {pot >= 1_000_000
            ? `${(pot / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
            : pot.toLocaleString()}{' '}
          $CLAWDIA
        </span>
      </span>
    </div>
  )
}

function EnterPageInner() {
  const params = useSearchParams()
  const roundId = params.get('r')
  const word    = params.get('w')?.toUpperCase()
  const handle  = params.get('h')

  const stats = useRoundStats(roundId)

  if (!roundId || !word || !handle) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-text-dim text-sm">Invalid entry link.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Header — matches main page */}
      <header className="bg-surface border-b border-border sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-3xl" role="img" aria-label="Crystal Ball">🔮</span>
            <div>
              <h1 className="text-[22px] font-display font-normal tracking-tight text-text leading-tight">
                SpellBlock
              </h1>
              <p className="text-[11px] text-text-dim font-body">
                Round {roundId}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">

        {/* Entry card */}
        <div className="w-full bg-surface border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-dim">Your word</span>
            <span className="text-2xl font-mono font-bold tracking-widest" style={{ color: 'var(--gold)' }}>
              {word}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-text-dim">Handle</span>
            <span className="text-sm font-medium text-text">@{handle}</span>
          </div>
          <div className="border-t border-border pt-3">
            <p className="text-xs text-text-dim leading-relaxed">
              Spell + valid lengths revealed at commit deadline. Entry scored after reveal.
            </p>
          </div>
        </div>

        {/* Live stats */}
        {stats !== null && (
          <div className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3">
            <StatsPill count={stats.count} pot={stats.pot} />
          </div>
        )}
        {stats === null && (
          <div className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 animate-pulse">
            <div className="h-4 bg-border rounded w-48 mx-auto" />
          </div>
        )}

        {/* Survival rules — what the word must survive */}
        <div className="w-full space-y-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-text-dim px-0.5">
            What your word must survive
          </h2>

          {/* Spell constraint */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-text">Constraint 1 — The Spell</span>
              <span className="text-[10.5px] font-mono text-text-dim bg-surface-2 border border-border px-2 py-0.5 rounded">
                one of these
              </span>
            </div>
            <div className="divide-y divide-border">
              {SPELLS.map(spell => (
                <div key={spell.name} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-lg w-6 text-center">{spell.icon}</span>
                  <div>
                    <span className="text-sm font-semibold text-text">{spell.name}</span>
                    <span className="text-sm text-text-dim ml-2">{spell.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 bg-surface-2 border-t border-border">
              <p className="text-[11.5px] text-text-dim">
                Which spell is active is hidden until the commit deadline. Build your word to survive as many as possible.
              </p>
            </div>
          </div>

          {/* Ruler constraint */}
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-text">Constraint 2 — The Ruler</span>
              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded border"
                style={{ color: 'var(--gold)', borderColor: 'var(--gold)', background: 'var(--accent-glow)' }}>
                always required
              </span>
            </div>
            <div className="px-4 py-3">
              <p className="text-sm text-text-dim leading-relaxed">
                Three valid word lengths are hidden and revealed at the deadline. Your word must match
                exactly one of them — or it fails, regardless of the spell.
              </p>
              <p className="text-[11.5px] text-text-dim mt-2 italic">
                Example: if valid lengths are <span className="font-mono font-semibold text-text">4, 6, 8</span> — a 5-letter word fails even if it passes the spell.
              </p>
            </div>
          </div>

          {/* Outcome summary */}
          <div className="bg-surface border border-border rounded-xl divide-y divide-border overflow-hidden">
            <div className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-base">🏆</span>
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--green)' }}>Pass both</span>
                <span className="text-sm text-text-dim ml-2">→ winner pool (90% of pot)</span>
              </div>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-base">🎲</span>
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--gold)' }}>Pass spell, fail ruler</span>
                <span className="text-sm text-text-dim ml-2">→ consolation (recover stake only)</span>
              </div>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-3">
              <span className="text-base">🔥</span>
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--red)' }}>Fail spell</span>
                <span className="text-sm text-text-dim ml-2">→ stake burned, joins pot for winners</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment form */}
        <div className="w-full">
          <PaymentForm roundId={roundId} word={word} handle={handle} minStake={MIN_STAKE} />
        </div>

        {/* Footer note */}
        <p className="text-[11px] text-text-dim text-center pb-4">
          by{' '}
          <a href="https://x.com/ClawdiaBotAI" target="_blank" rel="noopener noreferrer"
            className="hover:text-accent transition-colors">
            Clawdia
          </a>
          {' '}· on Base
        </p>
      </main>
    </div>
  )
}

export default function EnterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg" />}>
      <EnterPageInner />
    </Suspense>
  )
}
