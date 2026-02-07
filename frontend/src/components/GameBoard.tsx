'use client'

import { useReadContract, useAccount } from 'wagmi'
import { base } from 'viem/chains'
import { CONTRACTS, SPELLBLOCK_CORE_ABI, SPELL_NAMES, SPELL_DESCRIPTIONS } from '@/config/contracts'
import { CommitForm } from './CommitForm'
import { RevealForm } from './RevealForm'
import { BurnCounter } from './BurnCounter'
import { useEffect, useState } from 'react'

// Round phases
enum RoundPhase {
  Inactive = 0,
  Commit = 1,
  Reveal = 2,
  Finalized = 3
}

// Spell types with colors
const SPELL_TYPES: Record<string, { name: string; icon: string; desc: string; color: string }> = {
  '0': { name: 'Veto', icon: '🚫', desc: 'Must NOT contain', color: '#DC2626' },
  '1': { name: 'Anchor', icon: '⚓', desc: 'Must START with', color: '#2B6CB0' },
  '2': { name: 'Seal', icon: '🔒', desc: 'Must END with', color: '#7C3AED' },
  '3': { name: 'Gem', icon: '💎', desc: 'Must contain a double letter', color: '#D97706' },
}

function Countdown({ deadline }: { deadline: number }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = deadline - now
      if (diff <= 0) return setTimeLeft('00:00:00')
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadline])

  return (
    <div className="font-mono text-2xl font-semibold tracking-wide">
      {timeLeft}
    </div>
  )
}

function PhaseBanner({ phase, deadline, season }: { phase: RoundPhase; deadline: number; season?: { number: number; day: number } }) {
  const isCommit = phase === RoundPhase.Commit
  const bgGradient = isCommit
    ? 'linear-gradient(135deg, #E8F0FE 0%, #F0F4FF 100%)'
    : 'linear-gradient(135deg, #F0EAFE 0%, #F5F0FF 100%)'
  const dotColor = isCommit ? '#2B6CB0' : '#7C3AED'

  return (
    <div
      className="px-5 py-5 border-b border-border"
      style={{ background: bgGradient }}
    >
      <div className="max-w-[600px] mx-auto">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: dotColor,
                  boxShadow: `0 2px 8px ${dotColor}20`,
                }}
              />
              <span className="text-lg font-semibold">
                {isCommit ? 'Commit phase' : 'Reveal phase'}
              </span>
            </div>
            <div className="text-sm text-text-dim max-w-md">
              {isCommit
                ? 'Craft your word and stake your claim. Constraints are hidden.'
                : 'Spell & ruler revealed. Show your word to claim winnings.'}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">Phase ends in</div>
            <Countdown deadline={deadline} />
          </div>
        </div>

        {/* Phase track */}
        <div className="flex items-center">
          <PhaseStep label="Open" time="16:00 UTC / 11:00 AM ET" active={phase >= RoundPhase.Commit} color={phase >= RoundPhase.Commit ? '#2B6CB0' : '#D8D5CC'} />
          <div className="flex-[2] h-0.5 mx-1" style={{ background: phase >= RoundPhase.Reveal ? '#2B6CB0' : '#D8D5CC' }} />
          <PhaseStep label="Reveal" time="08:00 UTC / 03:00 AM ET" active={phase >= RoundPhase.Reveal} color={phase >= RoundPhase.Reveal ? '#7C3AED' : '#D8D5CC'} />
          <div className="flex-1 h-0.5 mx-1" style={{ background: phase >= RoundPhase.Finalized ? '#7C3AED' : '#D8D5CC' }} />
          <PhaseStep label="Settle" time="15:45 UTC / 10:45 AM ET" active={phase >= RoundPhase.Finalized} color={phase >= RoundPhase.Finalized ? '#16A34A' : '#D8D5CC'} />
        </div>
      </div>
    </div>
  )
}

function PhaseStep({ label, time, active, color }: { label: string; time: string; active: boolean; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[48px]">
      <div
        className="w-2.5 h-2.5 rounded-full border-2"
        style={{
          background: color,
          borderColor: color,
          boxShadow: active ? `0 2px 6px ${color}30` : 'none',
        }}
      />
      <span className={`text-[9.5px] font-semibold uppercase tracking-wider ${active ? 'text-text' : 'text-text-dim'}`}>
        {label}
      </span>
      <span className="text-[9.5px] font-mono text-text-dim opacity-50">{time}</span>
    </div>
  )
}

function PotDisplay({ totalPot, commitCount, season }: { totalPot: bigint; commitCount: number; season?: { number: number; day: number } }) {
  const formatAmount = (n: bigint) => {
    const val = Number(n) / 1e18
    if (val >= 1_000_000_000) return (val / 1_000_000_000).toFixed(2) + 'B'
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M'
    if (val >= 1_000) return (val / 1_000).toFixed(0) + 'K'
    return val.toFixed(0)
  }

  return (
    <div className="bg-gradient-to-br from-surface to-surface-2 border border-border rounded-2xl px-5 py-6 text-center mb-5">
      <div className="mb-3">
        <div className="text-[11px] font-semibold text-text-dim uppercase tracking-[0.1em] mb-0.5">Round pot</div>
        <div className="font-mono text-[40px] leading-none font-bold text-gold tracking-tight">
          {formatAmount(totalPot)}
        </div>
        <div className="text-xs text-text-dim font-medium mt-0.5">$CLAWDIA</div>
      </div>
      
      <div className="flex items-center justify-center gap-3.5 pt-2.5 border-t border-border text-center">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9.5px] text-text-dim uppercase tracking-wider">Commits</span>
          <span className="font-mono text-sm font-semibold">{commitCount}</span>
        </div>
        <div className="w-px h-6 bg-border" />
        <div className="flex flex-col gap-0.5">
          <span className="text-[9.5px] text-text-dim uppercase tracking-wider">Min stake</span>
          <span className="font-mono text-sm font-semibold">1M</span>
        </div>
      </div>
    </div>
  )
}

export function GameBoard() {
  const { address } = useAccount()
  const chainId = base.id
  const contracts = CONTRACTS[chainId]
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000))

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const { data: currentRoundId } = useReadContract({
    address: contracts.spellBlockCore,
    abi: SPELLBLOCK_CORE_ABI,
    functionName: 'currentRoundId',
    chainId,
  })

  const { data: round, refetch: refetchRound } = useReadContract({
    address: contracts.spellBlockCore,
    abi: SPELLBLOCK_CORE_ABI,
    functionName: 'rounds',
    args: currentRoundId ? [currentRoundId] : undefined,
    chainId,
  })

  const { data: commitment, refetch: refetchCommitment } = useReadContract({
    address: contracts.spellBlockCore,
    abi: SPELLBLOCK_CORE_ABI,
    functionName: 'commitments',
    args: currentRoundId && address ? [currentRoundId, address] : undefined,
    chainId,
  })

  const roundData = round ? {
    roundId: round[0] as bigint,
    startTime: round[1] as bigint,
    commitDeadline: round[2] as bigint,
    revealDeadline: round[3] as bigint,
    letterPool: round[4] as `0x${string}`,
    spellId: Number(round[5] || 0),
    spellParam: (round[6] as `0x${string}`) || '0x00',
    totalPot: BigInt(String(round[10] || 0)),
    commitCount: BigInt(String(round[12] || 0)),
  } : null

  const computePhase = () => {
    if (!roundData || !roundData.startTime) return RoundPhase.Inactive
    const start = Number(roundData.startTime)
    const commitEnd = Number(roundData.commitDeadline)
    const revealEnd = Number(roundData.revealDeadline)
    
    if (currentTime < start) return RoundPhase.Inactive
    if (currentTime >= start && currentTime < commitEnd) return RoundPhase.Commit
    if (currentTime >= commitEnd && currentTime < revealEnd) return RoundPhase.Reveal
    return RoundPhase.Finalized
  }
  const phase = computePhase()

  const letterPool = roundData?.letterPool ? 
    Buffer.from(roundData.letterPool.slice(2, 18), 'hex').toString('utf-8').replace(/\0/g, '') : 
    ''

  const isSpellRevealed = phase === RoundPhase.Reveal || phase === RoundPhase.Finalized
  const spellId = roundData?.spellId ?? 0
  const spellParam = roundData?.spellParam ?? '0x00'
  const spellLetter = spellParam ? String.fromCharCode(parseInt(spellParam.slice(2, 4), 16) || 65) : '?'
  const spell = SPELL_TYPES[String(spellId)]

  const hasCommitted = commitment && commitment.commitHash !== '0x0000000000000000000000000000000000000000000000000000000000000000'
  const minStake = BigInt('1000000000000000000000000')

  if (!currentRoundId || currentRoundId === 0n || phase === RoundPhase.Inactive) {
    return (
      <div className="max-w-[600px] mx-auto px-4 py-8">
        <div className="bg-surface border border-border rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-display mb-4">🔮 Preparing next ritual</h2>
          <p className="text-text-dim text-lg mb-6">
            The next round of SpellBlock will begin at 16:00 UTC / 11:00 AM ET daily!
          </p>
          <div className="bg-surface-2 border border-border rounded-lg p-4 text-sm">
            <div className="font-semibold mb-2">Daily schedule</div>
            <div className="text-text-dim space-y-1">
              <div>• Opens: 16:00 UTC / 11:00 AM ET</div>
              <div>• Commits close: 08:00 UTC / 03:00 AM ET</div>
              <div>• Reveals close: 15:45 UTC / 10:45 AM ET</div>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <BurnCounter />
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Phase Banner */}
      <PhaseBanner
        phase={phase}
        deadline={phase === RoundPhase.Commit ? Number(roundData?.commitDeadline) : Number(roundData?.revealDeadline)}
        season={{ number: 3, day: 7 }}
      />

      {/* Main Content */}
      <main className="max-w-[600px] mx-auto px-4 py-5">
        {/* Pot Display */}
        <PotDisplay
          totalPot={roundData?.totalPot || 0n}
          commitCount={Number(roundData?.commitCount || 0)}
          season={{ number: 3, day: 7 }}
        />

        {/* Game Section */}
        <div className="animate-fadeInUp">
          {phase === RoundPhase.Commit && (
            <>
              {/* Hidden constraints warning */}
              <div className="flex gap-3 items-start p-4 mb-6 rounded-xl border" style={{
                background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.12))',
                borderColor: 'rgba(124,58,237,0.18)'
              }}>
                <div className="text-2xl flex-shrink-0 mt-0.5">🎭</div>
                <div>
                  <div className="font-semibold text-sm mb-1">Constraints hidden</div>
                  <div className="text-xs text-text-dim leading-relaxed">
                    A spell (Veto, Anchor, Seal, or Gem) and three valid word lengths will be revealed at 08:00 UTC / 03:00 AM ET. Hedge wisely.
                  </div>
                </div>
              </div>

              {/* Commit Form */}
              {!hasCommitted && currentRoundId && (
                <CommitForm
                  roundId={currentRoundId}
                  letterPool={letterPool}
                  minStake={minStake}
                  onCommitSuccess={() => {
                    refetchCommitment()
                    refetchRound()
                  }}
                />
              )}

              {hasCommitted && (
                <div className="flex gap-3 items-start p-4 rounded-xl border animate-fadeInUp mt-4" style={{
                  background: 'linear-gradient(135deg, rgba(22,163,74,0.06), rgba(22,163,74,0.14))',
                  borderColor: 'rgba(22,163,74,0.3)'
                }}>
                  <div className="w-8 h-8 rounded-full bg-green text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-base mb-1">Committed</div>
                    <div className="text-xs text-text-dim leading-relaxed">
                      Your word is locked with {((Number(commitment?.stake || 0n) / 1e18) / 1000000).toFixed(1)}M $CLAWDIA. Constraints reveal at 08:00 UTC / 03:00 AM ET.
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {phase === RoundPhase.Reveal && (
            <>
              {/* Revealed constraints */}
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {/* Spell */}
                <div className="p-4 rounded-xl border" style={{
                  borderColor: `${spell?.color}40`,
                  background: `linear-gradient(160deg, ${spell?.color}06, ${spell?.color}14)`
                }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-2xl">{spell?.icon}</span>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-base font-bold" style={{ color: spell?.color }}>Spell</span>
                      <span className="text-xs font-semibold text-text-dim">{spell?.name}</span>
                    </div>
                  </div>
                  <div className="text-xs text-text-dim leading-relaxed">
                    {spell?.desc}{' '}
                    {spellId !== 3 && (
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded font-mono text-sm font-bold text-white align-middle ml-0.5" style={{ background: spell?.color }}>
                        {spellLetter}
                      </span>
                    )}
                  </div>
                </div>

                {/* Ruler */}
                <div className="p-4 rounded-xl border" style={{
                  borderColor: '#D9770640',
                  background: 'linear-gradient(160deg, #D9770606, #D9770614)'
                }}>
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-2xl">📏</span>
                    <span className="text-base font-bold text-gold">Ruler</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {[5, 8, 11].map((len) => (
                      <span
                        key={len}
                        className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded border"
                        style={{
                          background: '#D9770618',
                          color: '#D97706',
                          borderColor: '#D9770630'
                        }}
                      >
                        {len} letters
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reveal Form */}
              {hasCommitted && currentRoundId && (
                <RevealForm
                  roundId={currentRoundId}
                  spellId={spellId}
                  spellParam={spellParam}
                  onRevealSuccess={() => {
                    refetchCommitment()
                    refetchRound()
                  }}
                />
              )}
            </>
          )}
        </div>

        {/* Burn Counter */}
        <div className="mt-5">
          <BurnCounter />
        </div>
      </main>
    </>
  )
}
