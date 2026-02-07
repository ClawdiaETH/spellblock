'use client'

interface RulerDisplayProps {
  validLengths: readonly [number, number, number]
  isRevealed: boolean
}

export function RulerDisplay({ validLengths, isRevealed }: RulerDisplayProps) {
  if (!isRevealed) {
    return (
      <div className="glass-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">📏</span>
          <h3 className="font-heading font-bold text-amber-bright">Clawdia's ruler</h3>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-display font-bold text-text-dim mb-2">
            ? ? ?
          </div>
          <div className="text-sm text-text-secondary">
            3 valid word lengths (hidden until commit phase closes)
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg">📏</span>
        <h3 className="font-heading font-bold text-amber-bright">Clawdia's ruler</h3>
      </div>
      
      <div className="text-center">
        <div className="flex items-center justify-center gap-4 mb-2">
          {validLengths.map((length, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="text-3xl font-display font-bold text-amber-glow">
                {length}
              </div>
              <div className="text-xs text-text-dim">
                {length === 1 ? 'letter' : 'letters'}
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-sm text-text-secondary mb-3">
          Your word must be one of these lengths to win
        </div>
        
        <div className="text-xs text-text-dim">
          Words that pass the spell but miss length → consolation pool
        </div>
      </div>
    </div>
  )
}