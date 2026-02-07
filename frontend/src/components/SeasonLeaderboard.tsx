'use client'

// TODO: Replace with actual contract data when SeasonAccumulator is deployed

export function SeasonLeaderboard() {
  return (
    <div className="glass-panel p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏆</span>
          <h3 className="font-heading font-bold text-amber-bright">Season leaderboard</h3>
        </div>
      </div>
      
      <div className="text-center py-6">
        <div className="text-3xl mb-2">🚧</div>
        <div className="text-text-secondary text-sm">
          Coming soon
        </div>
        <div className="text-text-dim text-xs mt-2">
          Leaderboard tracking will be enabled<br/>once we have enough rounds
        </div>
      </div>
    </div>
  )
}
