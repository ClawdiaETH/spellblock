'use client'

import { useState } from 'react'
import { useFarcasterMiniApp } from '@/contexts/FarcasterMiniAppContext'

interface ShareResultButtonProps {
  score: number
  roundNumber: number
  word?: string
  className?: string
}

export function ShareResultButton({ 
  score, 
  roundNumber, 
  word,
  className = '' 
}: ShareResultButtonProps) {
  const { isInMiniApp } = useFarcasterMiniApp()
  const [isSharing, setIsSharing] = useState(false)

  // Only show in mini app
  if (!isInMiniApp) return null

  const handleShare = async () => {
    setIsSharing(true)
    
    try {
      // Dynamically import SDK to avoid SSR issues
      const { sdk } = await import('@farcaster/miniapp-sdk')
      
      // Create engaging share text
      const shareText = word 
        ? `🎯 I scored ${score} points with "${word.toUpperCase()}" in SpellBlock Round ${roundNumber}!\n\nCan you beat my word? Play now!`
        : `🎯 I scored ${score} points in SpellBlock Round ${roundNumber}!\n\nThink you can beat me? Play now!`

      const result = await sdk.actions.composeCast({
        text: shareText,
        embeds: ['https://spellblock.vercel.app/'],
        channelKey: 'games' // Optional - posts to /games channel
      })
      
      // Check if cast was successful (not cancelled)
      if (result.cast) {
        console.log('Cast published:', result.cast.hash)
        // Could show success message here
      } else {
        console.log('User cancelled cast')
      }
    } catch (error: any) {
      console.error('Cast failed:', error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <button
      onClick={handleShare}
      disabled={isSharing}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-violet-bright/80 hover:bg-violet-bright
        rounded-lg font-medium text-white
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isSharing ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Sharing...
        </>
      ) : (
        <>
          <span className="text-lg">📢</span>
          Share Result
        </>
      )}
    </button>
  )
}