'use client'

import { useState, useEffect } from 'react'

enum RoundPhase {
  Inactive = 0,
  Commit = 1,
  Reveal = 2,
  Finalized = 3
}

interface PhaseBannerProps {
  phase: RoundPhase
  phaseEnd: number // Unix timestamp in seconds
}

export function PhaseBanner({ phase, phaseEnd }: PhaseBannerProps) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = Math.floor(Date.now() / 1000)
      const diff = phaseEnd - now
      
      if (diff <= 0) {
        setTimeLeft('00:00:00')
        return
      }

      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      
      setTimeLeft(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phaseEnd])

  const isCommit = phase === RoundPhase.Commit

  return (
    <div
      className="px-5 pt-[18px] pb-3.5 border-b"
      style={{
        backgroundColor: isCommit ? '#EFF6FF' : '#F5F3FF',
        borderColor: 'var(--border)',
      }}
    >
      {/* Phase info + timer */}
      <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 text-[17px] font-semibold mb-0.5 text-text">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                background: isCommit ? 'var(--accent)' : 'var(--purple)',
                boxShadow: isCommit ? '0 2px 8px var(--accent-glow)' : '0 2px 8px var(--purple-glow, rgba(124, 58, 237, 0.2))',
              }}
            />
            {isCommit ? 'Commit phase' : 'Reveal phase'}
          </div>
          <div className="text-[13px] text-text-dim max-w-[380px]">
            {isCommit
              ? 'Craft your word and stake your claim. Constraints are hidden.'
              : 'Spell & ruler revealed. Show your word to claim winnings.'}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-text-dim uppercase tracking-wider mb-0.5">
            Phase ends in
          </div>
          <div className="font-mono text-[26px] font-semibold tracking-wide text-text">
            {timeLeft}
          </div>
        </div>
      </div>

      {/* Phase progress track - 16hr commit (2x width) + 8hr reveal (1x width) */}
      <div className="flex items-center">
        <PhaseStep 
          label="Open" 
          time="16:00 UTC" 
          timeET="11:00 AM ET"
          active={true} 
          color="var(--accent)" 
        />
        <div
          className="flex-[2] h-0.5 rounded -mt-[18px]"
          style={{ background: isCommit ? 'var(--border)' : 'var(--accent)' }}
        />
        <PhaseStep 
          label="Reveal" 
          time="08:00 UTC" 
          timeET="03:00 AM ET"
          active={!isCommit} 
          color={isCommit ? 'var(--border)' : 'var(--purple)'} 
        />
        <div
          className="flex-1 h-0.5 rounded -mt-[18px]"
          style={{ background: 'var(--border)' }}
        />
        <PhaseStep 
          label="Settle" 
          time="15:45 UTC" 
          timeET="10:45 AM ET"
          active={false} 
          color="var(--border)" 
        />
      </div>
    </div>
  )
}

interface PhaseStepProps {
  label: string
  time: string
  timeET: string
  active: boolean
  color: string
}

function PhaseStep({ label, time, timeET, active, color }: PhaseStepProps) {
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
      <span
        className={`text-[9.5px] font-semibold uppercase tracking-wide ${
          active ? 'text-text' : 'text-text-dim'
        }`}
      >
        {label}
      </span>
      <span className="text-[9.5px] font-mono text-text-dim dark:text-text/60">
        {time}
      </span>
      <span className="text-[8.5px] font-mono text-text-dim dark:text-text/50">
        {timeET}
      </span>
    </div>
  )
}
