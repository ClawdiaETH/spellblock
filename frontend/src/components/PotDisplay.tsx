'use client'

import { formatUnits } from 'viem'

interface PotDisplayProps {
  totalPot: bigint
  commitCount: number
  season?: { number: number; day: number }
  minStake?: bigint
}

export function PotDisplay({ 
  totalPot, 
  commitCount,
  season = { number: 3, day: 7 },
  minStake = BigInt('1000000000000000000000000') // 1M $CLAWDIA
}: PotDisplayProps) {
  const formatPot = (amount: bigint) => {
    const formatted = parseFloat(formatUnits(amount, 18))
    if (formatted >= 1_000_000_000) {
      return (formatted / 1_000_000_000).toFixed(2) + 'B'
    }
    if (formatted >= 1_000_000) {
      return (formatted / 1_000_000).toFixed(1) + 'M'
    }
    if (formatted >= 1_000) {
      return (formatted / 1_000).toFixed(0) + 'K'
    }
    return formatted.toLocaleString(undefined, { maximumFractionDigits: 0 })
  }

  const formatMinStake = (amount: bigint) => {
    const formatted = parseFloat(formatUnits(amount, 18))
    if (formatted >= 1_000_000) {
      return (formatted / 1_000_000).toFixed(0) + 'M'
    }
    return formatted.toLocaleString()
  }

  return (
    <div
      className="rounded-[14px] border p-6 pb-3.5 mb-5 text-center"
      style={{
        background: 'linear-gradient(145deg, var(--surface) 0%, var(--surface-2) 100%)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Pot amount */}
      <div className="mb-3.5">
        <div className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-dim)' }}>
          Round pot
        </div>
        <div 
          className="font-mono text-[40px] font-bold tracking-tight leading-none"
          style={{ color: 'var(--gold)' }}
        >
          {formatPot(totalPot)}
        </div>
        <div className="text-[12px] font-medium mt-0.5" style={{ color: 'var(--text-dim)' }}>
          $CLAWDIA
        </div>
      </div>

      {/* Meta row */}
      <div 
        className="flex justify-center items-center gap-3.5 pt-2.5 border-t"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9.5px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            Commits
          </span>
          <span className="font-mono text-[13px] font-semibold">
            {commitCount}
          </span>
        </div>

        <div className="w-px h-6" style={{ background: 'var(--border)' }} />

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9.5px] uppercase tracking-wider" style={{ color: 'var(--text-dim)' }}>
            Min stake
          </span>
          <span className="font-mono text-[13px] font-semibold">
            {formatMinStake(minStake)}
          </span>
        </div>
      </div>
    </div>
  )
}
