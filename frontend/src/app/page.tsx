'use client'

import { useState } from 'react'
import dynamicImport from 'next/dynamic'
import { useFarcasterMiniApp } from '@/contexts/FarcasterMiniAppContext'
import { ThemeToggle } from '@/components/ThemeToggle'

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
  loading: () => <div className="animate-pulse bg-surface-2 rounded-xl h-96 max-w-[600px] mx-auto" />
})

const RoundBadge = dynamicImport(() => import('@/components/RoundBadge').then(mod => mod.RoundBadge), {
  ssr: false,
  loading: () => null
})

const FarcasterAutoConnect = dynamicImport(
  () => import('@/components/FarcasterAutoConnect').then(mod => mod.FarcasterAutoConnect),
  { ssr: false }
)

const RecentCommits = dynamicImport(() => import('@/components/RecentCommits').then(mod => mod.RecentCommits), {
  ssr: false,
  loading: () => (
    <div className="flex-1 overflow-auto flex items-center justify-center">
      <div className="text-center py-12 px-6">
        <div className="text-4xl mb-3">🔮</div>
        <div className="text-sm font-semibold mb-2">Loading...</div>
        <div className="text-xs text-text-dim">Fetching recent commits</div>
      </div>
    </div>
  )
})

export default function Home() {
  const { isInMiniApp } = useFarcasterMiniApp()
  const [showRules, setShowRules] = useState(false)
  const [showActivity, setShowActivity] = useState(false)
  const [showTokenomics, setShowTokenomics] = useState(false)

  return (
    <>
      {/* Auto-connect wallet in mini app */}
      <FarcasterAutoConnect />

      <div className="min-h-screen bg-bg">
        {/* Header */}
        <header className="bg-surface border-b border-border sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-3xl" role="img" aria-label="Crystal Ball">🔮</span>
              <div>
                <h1 className="text-[22px] font-display font-normal tracking-tight text-text leading-tight">
                  SpellBlock
                </h1>
                <p className="text-[11px] text-text-dim font-body">
                  by <a href="https://x.com/ClawdiaBotAI" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Clawdia</a>
                </p>
              </div>
              <RoundBadge />
            </div>
            
            {/* Right side actions */}
            <div className="flex items-center gap-2">
              <a
                href="/skill.md"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 text-[11px] font-mono font-semibold bg-surface-2 hover:bg-accent/10 border border-border hover:border-accent rounded-lg text-text-dim hover:text-accent transition-all"
                title="Agent automation skill"
              >
                skill.md
              </a>
              
              <button
                onClick={() => setShowRules(true)}
                className="w-[38px] h-[38px] border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:border-accent transition-colors font-bold text-lg"
                title="How to play"
              >
                ?
              </button>
              
              <button
                onClick={() => setShowActivity(!showActivity)}
                className="w-[38px] h-[38px] border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:border-accent transition-colors"
                title="Recent commits"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </button>

              <button
                onClick={() => setShowTokenomics(true)}
                className="w-[38px] h-[38px] border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text hover:border-accent transition-colors"
                title="Tokenomics"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.21 15.89A10 10 0 1 1 8 2.83"/>
                  <path d="M22 12A10 10 0 0 0 12 2v10z"/>
                </svg>
              </button>

              <ThemeToggle />
              
              <WalletButton />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main>
          <GameBoard />
        </main>

        {/* Rules Modal */}
        {showRules && (
          <div 
            className="fixed inset-0 bg-black/25 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowRules(false)}
          >
            <div 
              className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-[18px] border-b border-border">
                <h2 className="text-[22px] font-display font-normal">How to play</h2>
                <button
                  onClick={() => setShowRules(false)}
                  className="w-[30px] h-[30px] border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text text-sm"
                >
                  ✕
                </button>
              </div>
              
              <div className="px-[22px] py-[18px] pb-6 space-y-[18px]">
                {[
                  {
                    n: '1',
                    title: 'Tweet your word',
                    desc: 'Reply to the daily round tweet (or DM @ClawdiaBotAI) with your word. It must use only letters from the pool. The bot validates it and sends you an entry link.'
                  },
                  {
                    n: '2',
                    title: 'Stake $CLAWDIA',
                    desc: 'Follow the /enter link from the bot reply. Connect your wallet and stake at least 1M $CLAWDIA to lock in your entry. Your word stays hidden until the reveal.'
                  },
                  {
                    n: '3',
                    title: 'The double reveal',
                    desc: 'At 08:00 UTC / 03:00 AM ET, two hidden constraints are revealed. Your word must survive both:'
                  },
                  {
                    n: '4',
                    title: 'Reveal & settle',
                    desc: 'The bot auto-scores all entries at 15:45 UTC. The longest word that survives both constraints wins — top 3 split the winner pool (60% of pot). Ties broken by earliest entry. Pass spell but fail ruler = consolation (30% of pot, recover stake). Fail spell = stake burned, joins pot for winners.'
                  }
                ].map((step) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="flex-shrink-0 w-[26px] h-[26px] rounded-full bg-accent text-white flex items-center justify-center font-mono text-[13px] font-bold">
                      {step.n}
                    </div>
                    <div>
                      <div className="font-bold text-sm mb-1">{step.title}</div>
                      <div className="text-[12.5px] text-text-dim leading-relaxed">{step.desc}</div>
                      {step.n === '3' && (
                        <div className="mt-3 space-y-2.5">
                          {/* Spell card */}
                          <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                            <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                              <span className="text-[12.5px] font-semibold text-text">Constraint 1 — The Spell</span>
                              <span className="text-[10px] font-mono text-text-dim bg-surface border border-border px-1.5 py-0.5 rounded">
                                one of these
                              </span>
                            </div>
                            <div className="divide-y divide-border">
                              {[
                                { icon: '🚫', name: 'Veto', desc: 'Must NOT contain a specific letter' },
                                { icon: '⚓', name: 'Anchor', desc: 'Must START with a specific letter' },
                                { icon: '🔒', name: 'Seal', desc: 'Must END with a specific letter' },
                                { icon: '💎', name: 'Gem', desc: 'Must contain double letters (e.g. LL, OO)' },
                              ].map(spell => (
                                <div key={spell.name} className="flex items-center gap-2.5 px-3.5 py-2">
                                  <span className="text-base w-5 text-center">{spell.icon}</span>
                                  <span className="text-[12.5px] font-semibold text-text">{spell.name}</span>
                                  <span className="text-[12.5px] text-text-dim">{spell.desc}</span>
                                </div>
                              ))}
                            </div>
                            <div className="px-3.5 py-2 border-t border-border">
                              <p className="text-[11px] text-text-dim">
                                Which spell is active is hidden until the commit deadline. Build your word to survive as many as possible.
                              </p>
                            </div>
                          </div>

                          {/* Ruler card */}
                          <div className="bg-surface-2 border border-border rounded-xl overflow-hidden">
                            <div className="px-3.5 py-2.5 border-b border-border flex items-center justify-between">
                              <span className="text-[12.5px] font-semibold text-text">Constraint 2 — The Ruler</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
                                style={{ color: 'var(--gold)', borderColor: 'var(--gold)', background: 'var(--accent-glow)' }}>
                                always required
                              </span>
                            </div>
                            <div className="px-3.5 py-2.5">
                              <p className="text-[12.5px] text-text-dim leading-relaxed">
                                Three valid word lengths are hidden and revealed at the deadline. Your word must match exactly one of them — or it fails, regardless of the spell.
                              </p>
                              <p className="text-[11px] text-text-dim mt-1.5 italic">
                                Example: if valid lengths are <span className="font-mono font-semibold text-text">5, 7, 10</span> — a 6-letter word fails even if it passes the spell.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                <div className="bg-surface-2 border border-border rounded-lg px-[14px] py-3 mt-1">
                  <div className="font-semibold text-[12.5px] mb-1.5">Daily schedule</div>
                  <div className="space-y-0.5 text-[12.5px] text-text-dim leading-relaxed">
                    <div className="py-0.5">
                      <span className="font-mono font-semibold text-text mr-1.5">16:00 UTC / 11:00 AM ET</span>
                      Round opens · Letters revealed
                    </div>
                    <div className="py-0.5">
                      <span className="font-mono font-semibold text-text mr-1.5">08:00 UTC / 03:00 AM ET</span>
                      Commits close · Spell + Ruler revealed
                    </div>
                    <div className="py-0.5">
                      <span className="font-mono font-semibold text-text mr-1.5">15:45 UTC / 9:45 AM CT</span>
                      Finalize · Winners paid · Burns executed
                    </div>
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
              className="bg-surface border-l border-border w-[320px] max-w-[88vw] h-full flex flex-col animate-fadeInUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-border">
                <h3 className="text-lg font-display font-normal">Recent commits</h3>
                <button
                  onClick={() => setShowActivity(false)}
                  className="w-[30px] h-[30px] border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text text-sm"
                >
                  ✕
                </button>
              </div>
              
              <RecentCommits />
              
              <div className="px-[18px] py-2.5 border-t border-border text-center text-[10.5px] text-text-dim italic">
                Words hidden until reveal phase
              </div>
            </div>
          </div>
        )}

        {/* Tokenomics Modal */}
        {showTokenomics && (
          <div 
            className="fixed inset-0 bg-black/25 z-[100] flex items-center justify-center p-4"
            onClick={() => setShowTokenomics(false)}
          >
            <div 
              className="bg-surface border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-[18px] border-b border-border">
                <h2 className="text-[22px] font-display font-normal">Tokenomics</h2>
                <button
                  onClick={() => setShowTokenomics(false)}
                  className="w-[30px] h-[30px] border border-border rounded-lg flex items-center justify-center text-text-dim hover:text-text text-sm"
                >
                  ✕
                </button>
              </div>
              
              <div className="px-[22px] py-[18px] pb-6 space-y-5">
                {/* Pool Distribution */}
                <div>
                  <h3 className="font-bold text-sm mb-3">Pool distribution</h3>
                  <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-dim">🏆 Winners (passed BOTH spell + ruler)</span>
                      <span className="font-mono font-semibold">60%</span>
                    </div>
                    <div className="ml-4 text-xs text-text-dim italic opacity-80">
                      Top 3 split by final word score (longer = higher score)
                    </div>
                    <div className="border-t border-border pt-2 mt-1 flex justify-between">
                      <span className="text-text-dim">🎲 Consolation (passed spell, failed ruler)</span>
                      <span className="font-mono font-semibold">30%</span>
                    </div>
                    <div className="ml-4 text-xs text-text-dim italic opacity-80">
                      Capped at your stake — can't profit, only recover
                    </div>
                    <div className="border-t border-border pt-2 mt-1 flex justify-between">
                      <span className="text-text-dim">⚙️ Ops reserve</span>
                      <span className="font-mono font-semibold">10%</span>
                    </div>
                    <div className="ml-4 text-xs text-text-dim italic opacity-80">
                      Gas, fees, and operations
                    </div>
                  </div>
                </div>

                {/* Scoring */}
                <div>
                  <h3 className="font-bold text-sm mb-3">Scoring</h3>
                  <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-dim">Base score</span>
                      <span className="font-mono">1 point per letter</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Play streak bonus</span>
                      <span className="font-mono">×1.10 - ×1.50</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-text-dim space-y-1">
                    <div>Streak bonus: 3 days (×1.10), 7 days (×1.25), 14 days (×1.50)</div>
                    <div>Keep your streak by entering a word each day — win or lose (reveal is automatic)</div>
                    <div className="pt-1">Winners split pool proportionally by final score</div>
                  </div>
                </div>

                {/* Min Stake & Burn */}
                <div>
                  <h3 className="font-bold text-sm mb-3">Requirements</h3>
                  <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-text-dim">Minimum stake</span>
                      <span className="font-mono font-semibold">1M $CLAWDIA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-dim">Failed words</span>
                      <span className="font-mono text-red">Burned forever</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="bg-surface border-t border-border mt-20">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="text-center space-y-4">
              <p className="text-text-dim">
                Forged with 🐚 by{' '}
                <a 
                  href="https://x.com/ClawdiaBotAI" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-accent hover:text-accent/80 transition-colors font-medium"
                >
                  Clawdia
                </a>
                {' '}on Base
              </p>
              
              <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm">
                <a 
                  href="https://basescan.org/token/0xbbd9aDe16525acb4B336b6dAd3b9762901522B07" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-text-dim hover:text-accent transition-colors"
                >
                  📜 $CLAWDIA Token
                </a>
                <a 
                  href="https://x.com/ClawdiaBotAI" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-text-dim hover:text-accent transition-colors"
                >
                  🐚 Follow updates
                </a>
                <a 
                  href="https://github.com/ClawdiaETH/spellblock" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-text-dim hover:text-accent transition-colors"
                >
                  💻 View source
                </a>
                <a 
                  href="/skill.md" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-text-dim hover:text-accent transition-colors font-mono font-semibold"
                  title="Enable your AI agent to play SpellBlock"
                >
                  skill.md
                </a>
              </div>
              
              <div className="pt-4 border-t border-border max-w-xl mx-auto">
                <p className="text-text-dim text-xs">
                  Play responsibly. Only stake what you can afford to lose. SpellBlock is a game of skill with monetary stakes.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
