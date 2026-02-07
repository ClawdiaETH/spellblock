'use client'

import { useState } from 'react'
import { useFarcasterMiniApp } from '@/contexts/FarcasterMiniAppContext'

interface ClawdiaSwapButtonProps {
  className?: string
}

export function ClawdiaSwapButton({ className = '' }: ClawdiaSwapButtonProps) {
  const { isInMiniApp } = useFarcasterMiniApp()
  const [isSwapping, setIsSwapping] = useState(false)

  // Only show in mini app
  if (!isInMiniApp) return null

  const handleSwap = async () => {
    setIsSwapping(true)
    
    try {
      // Dynamically import SDK to avoid SSR issues
      const { sdk } = await import('@farcaster/miniapp-sdk')
      
      const result = await sdk.actions.swapToken({
        // Sell token: USDC on Base (CAIP-19 format)
        sellToken: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        
        // Buy token: CLAWDIA on Base (CAIP-19 format)
        buyToken: 'eip155:8453/erc20:0xbbd9aDe16525acb4B336b6dAd3b9762901522B07',
        
        // Default amount: 1 USDC (1000000 because 6 decimals)
        sellAmount: '1000000',
      })
      
      if (result.success) {
        console.log('Swap successful:', result)
        // You might want to refetch user balances here
      }
    } catch (error: any) {
      if (error.error === 'rejected_by_user') {
        // User cancelled - do nothing
        console.log('User cancelled swap')
      } else {
        console.error('Swap failed:', error.message)
      }
    } finally {
      setIsSwapping(false)
    }
  }

  return (
    <button
      onClick={handleSwap}
      disabled={isSwapping}
      className={`
        flex items-center gap-2 px-4 py-2 
        bg-gradient-to-r from-amber-glow/80 to-violet-bright/80 
        hover:from-amber-glow hover:to-violet-bright
        rounded-lg font-medium text-white
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-all duration-200
        ${className}
      `}
    >
      {isSwapping ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Swapping...
        </>
      ) : (
        <>
          <span className="text-lg">🪙</span>
          Get CLAWDIA
        </>
      )}
    </button>
  )
}