'use client'

interface LetterPoolProps {
  letters: string
  usedIndices?: Set<number>
  onLetterClick?: (letter: string, index: number) => void
  disabled?: boolean
}

export function LetterPool({ 
  letters, 
  usedIndices = new Set(), 
  onLetterClick,
  disabled = false 
}: LetterPoolProps) {
  const letterArray = letters.split('')
  
  return (
    <div 
      className="flex flex-wrap gap-[7px] p-3.5 rounded-[10px] border"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--border)',
      }}
    >
      {letterArray.map((letter, index) => {
        const isUsed = usedIndices.has(index)
        
        return (
          <button
            key={index}
            onClick={() => !disabled && !isUsed && onLetterClick?.(letter, index)}
            disabled={disabled || isUsed}
            className="letter-tile"
            style={{
              opacity: isUsed ? 0.2 : 1,
              transform: isUsed ? 'scale(0.88)' : 'scale(1)',
              cursor: isUsed || disabled ? 'default' : 'pointer',
            }}
          >
            {letter.toUpperCase()}
          </button>
        )
      })}
    </div>
  )
}
