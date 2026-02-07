'use client'

import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'

export function ConnectPlayButton() {
  const { openConnectModal } = useConnectModal()
  const { isConnected } = useAccount()

  if (isConnected) {
    return (
      <button 
        className="arcane-button text-xl px-8 py-4 mb-4"
        onClick={() => document.getElementById('game')?.scrollIntoView({ behavior: 'smooth' })}
      >
        Scroll up to play ↑
      </button>
    )
  }

  return (
    <button 
      className="arcane-button text-xl px-8 py-4 mb-4"
      onClick={openConnectModal}
    >
      Connect wallet & play now
    </button>
  )
}
