'use client'

import { useCurrentRound } from '@/hooks/useCurrentRound'

export function RoundBadge() {
  const { currentRoundId } = useCurrentRound()

  if (!currentRoundId) return null

  return (
    <span className="font-mono text-[10.5px] font-medium px-[7px] py-[2px] bg-surface-2 border border-border rounded-[5px] text-text-dim">
      Round #{currentRoundId.toString()}
    </span>
  )
}
