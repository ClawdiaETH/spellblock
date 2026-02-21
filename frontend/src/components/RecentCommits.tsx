'use client'

import { useEffect, useState } from 'react'

interface Entry {
  handle: string
  stake: number        // raw CLAWDIA (e.g. 1000000)
  createdAt: string
}

function timeAgo(isoDate: string): string {
  const diff = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmtClawdia(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  return n.toLocaleString()
}

export function RecentCommits() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEntries = () => {
    fetch('/api/entries/recent?r=latest')
      .then(r => r.json())
      .then(d => {
        setEntries(d.entries ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 15_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12 px-6">
          <div className="text-4xl mb-3">🔮</div>
          <div className="text-sm font-semibold text-text">Loading...</div>
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center py-12 px-6">
          <div className="text-4xl mb-3">🔮</div>
          <div className="text-sm font-semibold text-text mb-1">No entries yet</div>
          <div className="text-xs text-text-dim">Be the first to enter!</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="px-[18px] py-3 space-y-0">
        {entries.map((entry, idx) => (
          <div
            key={`${entry.handle}-${idx}`}
            className="py-3 border-b border-border last:border-0"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-text">@{entry.handle}</span>
              <span className="text-[11px] text-text-dim">{timeAgo(entry.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-[11.5px]">
              <span className="text-text-dim">staked</span>
              <span className="font-mono font-semibold" style={{ color: 'var(--gold)' }}>
                {fmtClawdia(entry.stake)} $CLAWDIA
              </span>
            </div>
            <div className="text-[10.5px] text-text-dim mt-0.5 italic">
              word hidden until reveal
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
