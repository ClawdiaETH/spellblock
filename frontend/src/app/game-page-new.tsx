'use client'

import { useState } from 'react'
import dynamicImport from 'next/dynamic'

const WalletButton = dynamicImport(() => import('@/components/WalletButton').then(mod => mod.WalletButton), {
  ssr: false,
  loading: () => (
    <button className="px-4 py-2 bg-accent/50 rounded-lg text-white/50 font-medium animate-pulse">
      Connect Wallet
    </button>
  )
})

const GameBoard = dynamicImport(() => import('@/components/GameBoard').then(mod => mod.GameBoard), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-surface-2 rounded-xl h-96" />
})

const FarcasterAutoConnect = dynamicImport(
  () => import('@/components/FarcasterAutoConnect').then(mod => mod.FarcasterAutoConnect),
  { ssr: false }
)

export default function GamePage() {
  const [showRules, setShowRules] = useState(false)
  const [showActivity, setShowActivity] = useState(false)

  return (
    <>
      {/* Auto-connect wallet in mini app */}
      <FarcasterAutoConnect />

      <div className="min-h-screen bg-bg">
        {/* Header */}
        <header className="bg-surface border-b border-border sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-4xl" role="img" aria-label="Crystal Ball">🔮</span>
              <div>
                <h1 className="text-2xl font-display font-normal tracking-tight text-text">
                  SpellBlock
                </h1>
                <p className="text-xs text-text-dim font-body">by Clawdia</p>
              </div>
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowRules(true)}
                className="w-9 h-9 border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:border-accent transition-colors"
                title="How to play"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </button>
              
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="relative w-9 h-9 border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:border-accent transition-colors"
                title="Activity"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-green rounded-full animate-pulse" />
              </button>
              
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <GameBoard />
        </main>

        {/* Rules Modal */}
        {showRules && (
          <div 
            className="fixed inset-0 bg-black/25 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowRules(false)}
          >
            <div 
              className="bg-surface border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-2xl font-display font-normal">How to play</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="w-8 h-8 border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text"
                >
                  ✕
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {[
                  {
                    n: '1',
                    title: 'Craft your word',
                    desc: 'Each round reveals a pool of letters. Build a word using only those letters — you\'re betting it survives hidden constraints.'
                  },
                  {
                    n: '2',
                    title: 'Stake & commit',
                    desc: 'Stake $CLAWDIA tokens. Your word is hashed onchain — nobody sees it, and you can\'t change it.'
                  },
                  {
                    n: '3',
                    title: 'The double reveal',
                    desc: 'At 08:00 UTC / 03:00 AM ET, two hidden constraints appear:'
                  },
                  {
                    n: '4',
                    title: 'Reveal & settle',
                    desc: 'Reveal your word. If it passes both spell and ruler, you win a share of the pot. If not, your stake burns forever.'
                  }
                ].map((step) => (
                  <div key={step.n} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center font-mono text-sm font-bold">
                      {step.n}
                    </div>
                    <div>
                      <div className="font-semibold text-base mb-1">{step.title}</div>
                      <div className="text-sm text-text-dim leading-relaxed">{step.desc}</div>
                      {step.n === '3' && (
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span>🚫</span>
                            <strong>Veto:</strong>
                            <span className="text-text-dim">Must NOT contain [letter]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>⚓</span>
                            <strong>Anchor:</strong>
                            <span className="text-text-dim">Must START with [letter]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>🔒</span>
                            <strong>Seal:</strong>
                            <span className="text-text-dim">Must END with [letter]</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>💎</span>
                            <strong>Gem:</strong>
                            <span className="text-text-dim">Must contain double letters</span>
                          </div>
                          <div className="text-text-dim mt-2">
                            Plus the <strong>Ruler</strong> — three valid word lengths your word must match.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="bg-surface-2 border border-border rounded-lg p-4 mt-6">
                  <div className="font-semibold text-sm mb-3">Daily schedule</div>
                  <div className="space-y-2 text-sm">
                    <div><span className="font-mono font-semibold">16:00 UTC / 11:00 AM ET</span> Round opens · Letters revealed</div>
                    <div><span className="font-mono font-semibold">08:00 UTC / 03:00 AM ET</span> Commits close · Spell + Ruler revealed</div>
                    <div><span className="font-mono font-semibold">15:45 UTC / 9:45 AM CT</span> Finalize · Winners paid · Burns executed</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Panel */}
        {showActivity && (
          <div 
            className="fixed inset-0 bg-black/25 z-[100] flex justify-end"
            onClick={() => setShowActivity(false)}
          >
            <div 
              className="bg-surface border-l border-border w-80 max-w-[88vw] h-full flex flex-col animate-fadeInUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-display font-normal">Live activity</h3>
                <button
                  onClick={() => setShowActivity(false)}
                  className="w-8 h-8 border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex-1 overflow-auto">
                <div className="divide-y divide-border">
                  {[
                    { addr: '0x1a2b...3c4d', stake: 5000000, time: '2m ago' },
                    { addr: '0x5e6f...7g8h', stake: 12000000, time: '4m ago' },
                    { addr: '0x9i0j...1k2l', stake: 1000000, time: '7m ago' },
                    { addr: '0x3m4n...5o6p', stake: 25000000, time: '11m ago' },
                    { addr: '0x7q8r...9s0t', stake: 3000000, time: '15m ago' },
                  ].map((activity, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                      <span className="font-mono text-xs text-text-dim">{activity.addr}</span>
                      <div className="text-right">
                        <div className="font-mono text-sm font-semibold text-gold">
                          {activity.stake >= 1000000 ? `${(activity.stake / 1000000).toFixed(1)}M` : activity.stake}
                        </div>
                        <div className="text-xs text-text-dim">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 border-t border-border text-center text-xs text-text-dim italic">
                Words hidden until reveal phase
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
